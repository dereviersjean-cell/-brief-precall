import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getUserRole, getUserOrganizationId } from "@/lib/db";
import { readPromptConfig, DEFAULT_PLAYBOOK_EXTRACTION_PROMPT } from "@/lib/admin-config";
import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "@/lib/ai-json";
import { extractTextFromUploadedFile, UnsupportedFileTypeError, SUPPORTED_DOCUMENT_FORMATS_LABEL } from "@/lib/document-text";

export type PlaybookExtractionDimension = {
  label: string;
  description: string;
  weight: number;
  criteria: string[];
};

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
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { dimensions?: PlaybookExtractionDimension[] };
    return parsed.dimensions ?? [];
  } catch (err) {
    console.error(
      "[playbook/import] extractPlaybookDimensions JSON parse failed:",
      err instanceof Error ? err.message : err,
      `\nRaw Claude response:\n${raw}`
    );
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

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
        if (err instanceof UnsupportedFileTypeError) {
          return NextResponse.json({ error: SUPPORTED_DOCUMENT_FORMATS_LABEL }, { status: 400 });
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
