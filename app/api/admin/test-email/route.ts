import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateFollowUpEmail } from "@/lib/email-followup";
import { readPromptConfig, DEFAULT_EMAIL_FOLLOWUP_PROMPT } from "@/lib/admin-config";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let transcript: string;
  let nextSteps: string[];
  let contactEmail: string;

  try {
    ({ transcript, nextSteps = [], contactEmail = "contact@exemple.com" } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "La transcription est requise." }, { status: 400 });
  }

  const promptUsed =
    (await readPromptConfig("email_followup_prompt")) ?? DEFAULT_EMAIL_FOLLOWUP_PROMPT;

  const result = await generateFollowUpEmail({
    transcript: transcript.trim(),
    nextSteps,
    contactEmail: contactEmail.trim() || "contact@exemple.com",
  });

  if (result.status === "skipped") {
    return NextResponse.json(
      { error: "Pas d'email : le modèle juge que ce transcript ne contient pas d'échange commercial exploitable." },
      { status: 422 }
    );
  }
  if (result.status === "error") {
    return NextResponse.json({ error: "Échec de la génération de l'email." }, { status: 500 });
  }

  return NextResponse.json({ email: result.email, prompt_used: promptUsed });
}
