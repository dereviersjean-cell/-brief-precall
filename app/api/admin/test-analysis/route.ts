import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { analyzeCall } from "@/lib/call-analysis";
import { readPromptConfig, DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT } from "@/lib/admin-config";
import { DEFAULT_PLAYBOOK_SNAPSHOT } from "@/lib/db";

const ADMIN_CONTEXT = {
  clientName: "Brief / Oliverlist",
  clientWebsite: "",
  prospectName: "Prospect test",
  prospectWebsite: "",
  meetingDate: new Date().toISOString().slice(0, 10),
};

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let transcript: string;
  try {
    ({ transcript } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "La transcription est requise." }, { status: 400 });
  }

  const promptUsed =
    (await readPromptConfig("call_analysis_system_prompt")) ?? DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT;

  // Explicit (rather than relying on analyzeCall's default param) so the
  // response can echo back exactly which snapshot was used — the admin UI
  // needs it to resolve dimension labels via getEffectiveScoresForDisplay.
  const analysis = await analyzeCall(transcript.trim(), ADMIN_CONTEXT, DEFAULT_PLAYBOOK_SNAPSHOT);

  return NextResponse.json({ analysis, prompt_used: promptUsed, playbook_snapshot: DEFAULT_PLAYBOOK_SNAPSHOT });
}
