import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "./inngest";
import { generateEmbeddingsBatch } from "./embeddings";
import { saveClientReferences, updateImportJob, getAllUsersWithRecallCalendar } from "./db";
import { syncAndScheduleForUser } from "./recall";

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
    const lines: string[] = [];
    for (const name of workbook.SheetNames as string[]) {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        defval: "",
      }) as Record<string, unknown>[];
      for (const row of rows) {
        const line = Object.entries(row)
          .filter(([, v]) => String(v).trim() !== "")
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        if (line.trim()) lines.push(line);
      }
    }
    return lines.join("\n");
  }

  throw new Error(`Type de fichier non supporté : ${fileType}`);
}

// ─── JSON parsing ─────────────────────────────────────────────────────────────

function extractJSON(raw: string): Record<string, unknown>[] {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  console.log("[inngest] cleaned tail:", cleaned.slice(-50));
  console.log("[inngest] start index:", start, "| end index:", end);
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// ─── Single-chunk Claude extraction ──────────────────────────────────────────

type ParsedReference = {
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
};

async function extractRefsFromChunk(
  chunkText: string,
  chunkIdx: number,
  totalChunks: number
): Promise<ParsedReference[]> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content:
          "Extrait toutes les références clients de ce texte. Pour chaque référence retourne un JSON avec : client_name, sector, company_size, problem, solution, result. Réponds uniquement en JSON valide, tableau d'objets.\n\nTexte :\n" +
          chunkText,
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  console.log("[inngest] raw length:", raw.length, "| starts with:", raw.slice(0, 30), "| ends with:", raw.slice(-30));
  console.log(
    `[inngest] chunk ${chunkIdx + 1}/${totalChunks} — length: ${raw.length} | tail:`,
    raw.slice(-80)
  );
  console.log("[inngest] chunk response:", raw.slice(0, 300));
  const parsed = extractJSON(raw);
  console.log("[inngest] parsed count:", parsed.length);
  return parsed.map((r) => ({
    client_name: (r.client_name as string) ?? null,
    sector: (r.sector as string) ?? null,
    company_size: (r.company_size as string) ?? null,
    problem: (r.problem as string) ?? null,
    solution: (r.solution as string) ?? null,
    result: (r.result as string) ?? null,
  }));
}

// ─── Chunking helper ──────────────────────────────────────────────────────────

const CHUNK_SIZE = 30;

function splitIntoChunks(rawText: string): string[] {
  const lines = rawText.split("\n").filter((l) => l.trim());
  const header = lines[0] ?? "";
  const dataLines = lines.slice(1);
  if (dataLines.length <= CHUNK_SIZE) return [rawText];
  return Array.from({ length: Math.ceil(dataLines.length / CHUNK_SIZE) }, (_, i) =>
    [header, ...dataLines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)].join("\n")
  );
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

    // Step 1 — extract raw text only
    const rawText = (await step.run("extract-text", async () => {
      try {
        if (file && fileType) {
          const extracted = await extractTextFromFile(file, fileType);
          console.log("[inngest] extracted text (first 500 chars):", extracted.slice(0, 500));
          return extracted;
        }
        if (text) return text.trim();
        return "";
      } catch (err) {
        console.error("[inngest] extract-text error:", JSON.stringify(err));
        throw err;
      }
    })) as string;

    if (!rawText) {
      await step.run("update-status-done-empty", async () => {
        await updateImportJob(jobId, { status: "done", processed: 0 });
      });
      return;
    }

    // Deterministic chunking from step result (outside steps — pure function of rawText)
    const chunks = splitIntoChunks(rawText);

    await step.run("init-chunk-progress", async () => {
      await updateImportJob(jobId, { chunks_total: chunks.length, chunks_done: 0 });
    });

    // Step per chunk — each calls Claude + updates progress
    const allRefs: ParsedReference[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkRefs = (await step.run(`extract-chunk-${i}`, async () => {
        const refs = await extractRefsFromChunk(chunks[i], i, chunks.length);
        await updateImportJob(jobId, { chunks_done: i + 1 });
        return refs;
      })) as ParsedReference[];
      allRefs.push(...chunkRefs);
    }

    await step.run("update-job-total", async () => {
      await updateImportJob(jobId, { total: allRefs.length });
    });

    for (let i = 0; i < allRefs.length; i += EMBED_BATCH) {
      const batchIdx = Math.floor(i / EMBED_BATCH);
      const batch = allRefs.slice(i, i + EMBED_BATCH);

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
      await updateImportJob(jobId, { status: "done", processed: allRefs.length });
    });
  }
);

export const syncRecallCalendars = inngest.createFunction(
  {
    id: "sync-recall-calendars",
    triggers: [{ cron: "*/15 * * * *" }],
  },
  async ({ step }) => {
    const users = (await step.run("get-users-with-recall", async () => {
      return getAllUsersWithRecallCalendar();
    })) as { id: string; email: string; recall_calendar_id: string }[];

    console.log("[sync-recall-calendars] users with calendar:", users.length);

    let totalChecked = 0;
    let totalScheduled = 0;
    let totalSkipped = 0;

    for (const user of users) {
      const result = (await step.run(`sync-user-${user.id}`, async () => {
        return syncAndScheduleForUser(user.id, user.email);
      })) as { checked: number; scheduled: number; skipped: number };

      totalChecked += result.checked;
      totalScheduled += result.scheduled;
      totalSkipped += result.skipped;
    }

    const summary = { users: users.length, checked: totalChecked, scheduled: totalScheduled, skipped: totalSkipped };
    console.log("[sync-recall-calendars] done —", JSON.stringify(summary));
    return summary;
  }
);
