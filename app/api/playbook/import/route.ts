import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId } from "@/lib/db";
import { readPromptConfig, DEFAULT_PLAYBOOK_EXTRACTION_PROMPT } from "@/lib/admin-config";
import Anthropic from "@anthropic-ai/sdk";

export type PlaybookExtractionDimension = {
  label: string;
  description: string;
  weight: number;
  criteria: string[];
};

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Same require() pattern as lib/inngest-functions.ts's extractTextFromFile
  // — pdf-parse ships as CJS, and this route is the only other PDF consumer.
  // pdf-parse v2 dropped the v1 callable-function export in favor of a
  // PDFParse class (new PDFParse({ data }).getText()) — do not revert to
  // require("pdf-parse")(buffer), it throws "pdfParse is not a function".
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return (result.value as string) ?? "";
}

async function extractTextFromUploadedFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type.includes("pdf") || name.endsWith(".pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (
    file.type.includes("word") ||
    file.type.includes("officedocument.wordprocessing") ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  ) {
    return extractTextFromDocx(buffer);
  }
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

// Shared by both import sources (this route's paste/file upload, and
// /api/playbook/notion/import) — the Claude extraction step is identical
// regardless of where the raw text came from.
export async function extractPlaybookDimensions(text: string): Promise<PlaybookExtractionDimension[]> {
  const systemPrompt = (await readPromptConfig("playbook_extraction_prompt")) ?? DEFAULT_PLAYBOOK_EXTRACTION_PROMPT;

  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: text.trim() }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as { dimensions?: PlaybookExtractionDimension[] };
  return parsed.dimensions ?? [];
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let text: string;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
      }
      try {
        text = await extractTextFromUploadedFile(file);
      } catch (err) {
        if (err instanceof Error && err.message === "UNSUPPORTED_FILE_TYPE") {
          return NextResponse.json({ error: "Formats acceptés : PDF, Word (.doc, .docx)." }, { status: 400 });
        }
        throw err;
      }
    } else {
      const body = (await request.json()) as { text?: string };
      text = body.text ?? "";
    }
  } catch (err) {
    console.error("[playbook/import] text extraction failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible d'extraire le texte du document." }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Aucun texte à analyser." }, { status: 400 });
  }

  try {
    const dimensions = await extractPlaybookDimensions(text);
    // Returned to the client for review only — nothing is applied to the
    // playbook here (see /api/playbook/apply-import).
    return NextResponse.json({ dimensions });
  } catch (err) {
    console.error("[playbook/import] extraction failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "L'extraction a échoué. Réessayez, ou saisissez le playbook manuellement." },
      { status: 500 }
    );
  }
}
