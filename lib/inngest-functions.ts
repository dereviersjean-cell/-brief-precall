import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "./inngest";
import { generateEmbeddingsBatch } from "./embeddings";
import { saveClientReferences, updateImportJob } from "./db";

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractTextFromFile(base64: string, fileType: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");

  if (fileType.includes("pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return (data.text as string) ?? "";
  }

  if (
    fileType.includes("word") ||
    fileType.includes("docx") ||
    fileType.includes("officedocument.wordprocessing")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return (result.value as string) ?? "";
  }

  if (
    fileType.includes("excel") ||
    fileType.includes("xlsx") ||
    fileType.includes("spreadsheetml") ||
    fileType.includes("xls")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    return (workbook.SheetNames as string[])
      .map((name) => XLSX.utils.sheet_to_csv(workbook.Sheets[name]) as string)
      .join("\n");
  }

  throw new Error(`Type de fichier non supporté : ${fileType}`);
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function extractJSON(raw: string): Record<string, unknown>[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// ─── Claude extraction ────────────────────────────────────────────────────────

const CHUNK_SIZE = 30;

type ParsedReference = {
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
};

async function extractAllRefs(rawText: string): Promise<ParsedReference[]> {
  const client = new Anthropic();
  const lines = rawText.split("\n").filter((l) => l.trim());
  const header = lines[0] ?? "";
  const dataLines = lines.slice(1);

  const chunks: string[] =
    dataLines.length <= CHUNK_SIZE
      ? [rawText]
      : Array.from({ length: Math.ceil(dataLines.length / CHUNK_SIZE) }, (_, i) =>
          [header, ...dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)].join("\n")
        );

  const allRefs: ParsedReference[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content:
            "Extrait toutes les références clients de ce texte. Pour chaque référence retourne un JSON avec : client_name, sector, company_size, problem, solution, result. Réponds uniquement en JSON valide, tableau d'objets.\n\nTexte :\n" +
            chunks[i],
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";
    console.log(
      `[inngest] chunk ${i + 1}/${chunks.length} — length: ${raw.length} | tail:`,
      raw.slice(-80)
    );
    const parsed = extractJSON(raw);
    allRefs.push(
      ...parsed.map((r) => ({
        client_name: (r.client_name as string) ?? null,
        sector: (r.sector as string) ?? null,
        company_size: (r.company_size as string) ?? null,
        problem: (r.problem as string) ?? null,
        solution: (r.solution as string) ?? null,
        result: (r.result as string) ?? null,
      }))
    );
  }

  return allRefs;
}

// ─── Inngest function ─────────────────────────────────────────────────────────

const EMBED_BATCH = 20;

export const processReferencesImport = inngest.createFunction(
  {
    id: "process-references-import",
    triggers: [{ event: "references/import.requested" }],
  },
  async ({ event, step }) => {
    const { userId, jobId, source, file, fileType, text } = event.data as {
      userId: string;
      jobId: string;
      source: string;
      file?: string;
      fileType?: string;
      text?: string;
    };

    await step.run("update-status-processing", async () => {
      await updateImportJob(jobId, { status: "processing" });
    });

    const references = (await step.run("extract-and-parse", async () => {
      try {
        let rawText = "";
        if (file && fileType) {
          rawText = await extractTextFromFile(file, fileType);
        } else if (text) {
          rawText = text.trim();
        }
        console.log("[inngest] extracted text (first 500 chars):", rawText.slice(0, 500));
        if (!rawText) return [];
        return extractAllRefs(rawText);
      } catch (err) {
        console.error("[inngest] extract error:", JSON.stringify(err));
        throw err;
      }
    })) as ParsedReference[];

    await step.run("update-job-total", async () => {
      await updateImportJob(jobId, { total: references.length });
    });

    for (let i = 0; i < references.length; i += EMBED_BATCH) {
      const batchIdx = Math.floor(i / EMBED_BATCH);
      const batch = references.slice(i, i + EMBED_BATCH);

      await step.run(`embed-save-batch-${batchIdx}`, async () => {
        const texts = batch.map((r) =>
          [r.sector, r.problem, r.solution, r.result, r.client_name]
            .filter(Boolean)
            .join(" ")
        );
        const embeddings = await generateEmbeddingsBatch(texts);
        await saveClientReferences(
          userId,
          batch.map((r, idx) => ({ ...r, source, embedding: embeddings[idx] }))
        );
        await updateImportJob(jobId, { processed: i + batch.length });
      });
    }

    await step.run("update-status-done", async () => {
      await updateImportJob(jobId, { status: "done", processed: references.length });
    });
  }
);
