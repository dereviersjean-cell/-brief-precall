import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  readConfig,
  readPromptConfig,
  setPromptConfig,
  writeConfig,
  DEFAULT_CONFIG,
  DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
  DEFAULT_EMAIL_FOLLOWUP_PROMPT,
  DEFAULT_REPLY_SUGGESTION_PROMPT,
  DEFAULT_QUOTE_GENERATION_PROMPT,
  DEFAULT_QUOTE_EMAIL_PROMPT,
  DEFAULT_TASK_EMAIL_PROMPT,
} from "@/lib/admin-config";

const PROMPT_KEYS = [
  "call_analysis_system_prompt",
  "email_followup_prompt",
  "reply_suggestion_prompt",
  "quote_generation_prompt",
  "quote_email_prompt",
  "task_email_prompt",
] as const;

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const [config, callAnalysis, emailFollowup, replyProspect, quoteGeneration, quoteEmail, taskEmail] = await Promise.all([
    readConfig(),
    readPromptConfig("call_analysis_system_prompt"),
    readPromptConfig("email_followup_prompt"),
    readPromptConfig("reply_suggestion_prompt"),
    readPromptConfig("quote_generation_prompt"),
    readPromptConfig("quote_email_prompt"),
    readPromptConfig("task_email_prompt"),
  ]);

  return NextResponse.json({
    systemPrompt: config.systemPrompt,
    call_analysis_system_prompt: callAnalysis ?? DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
    email_followup_prompt: emailFollowup ?? DEFAULT_EMAIL_FOLLOWUP_PROMPT,
    reply_suggestion_prompt: replyProspect ?? DEFAULT_REPLY_SUGGESTION_PROMPT,
    quote_generation_prompt: quoteGeneration ?? DEFAULT_QUOTE_GENERATION_PROMPT,
    quote_email_prompt: quoteEmail ?? DEFAULT_QUOTE_EMAIL_PROMPT,
    task_email_prompt: taskEmail ?? DEFAULT_TASK_EMAIL_PROMPT,
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let key: string;
  let value: string;
  try {
    ({ key, value } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (typeof key !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  if (key === "systemPrompt") {
    const current = await readConfig();
    await writeConfig({ ...current, systemPrompt: value });
    return NextResponse.json({ ok: true });
  }

  if ((PROMPT_KEYS as readonly string[]).includes(key)) {
    await setPromptConfig(key, value);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Clé inconnue." }, { status: 400 });
}

export const DEFAULTS = {
  systemPrompt: DEFAULT_CONFIG.systemPrompt,
  call_analysis_system_prompt: DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
  email_followup_prompt: DEFAULT_EMAIL_FOLLOWUP_PROMPT,
  reply_suggestion_prompt: DEFAULT_REPLY_SUGGESTION_PROMPT,
  quote_generation_prompt: DEFAULT_QUOTE_GENERATION_PROMPT,
  quote_email_prompt: DEFAULT_QUOTE_EMAIL_PROMPT,
  task_email_prompt: DEFAULT_TASK_EMAIL_PROMPT,
};
