import Anthropic from "@anthropic-ai/sdk";
import { readPromptConfig, DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT } from "./admin-config";

export type CallAnalysis = {
  global_score: number;
  opening_framing: { score: number; description: string };
  pain_point: { score: number; description: string };
  pitch_demo: { score: number; description: string };
  next_step: { score: number; description: string };
  coaching_summary: string;
  strengths: string[];
  weaknesses: string[];
  objections: string[];
  next_steps: string[];
};

const DEFAULT_ANALYSIS: CallAnalysis = {
  global_score: 0,
  opening_framing: { score: 0, description: "" },
  pain_point: { score: 0, description: "" },
  pitch_demo: { score: 0, description: "" },
  next_step: { score: 0, description: "" },
  coaching_summary: "",
  strengths: [],
  weaknesses: [],
  objections: [],
  next_steps: [],
};

export type AnalyzeContext = {
  clientName: string;
  clientWebsite: string;
  prospectName: string;
  prospectWebsite: string;
  meetingDate: string;
};

export async function analyzeCall(
  transcript: string,
  context: AnalyzeContext
): Promise<CallAnalysis> {
  const client = new Anthropic();

  const basePrompt = (await readPromptConfig("call_analysis_system_prompt")) ?? DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT;

  const systemPrompt = `${basePrompt}

Contexte de l'appel :
- Date : ${context.meetingDate}
- Société du commercial : ${context.clientName || "Non renseigné"}${context.clientWebsite ? ` (${context.clientWebsite})` : ""}
- Société du prospect : ${context.prospectName || "Non renseigné"}${context.prospectWebsite ? ` (${context.prospectWebsite})` : ""}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: `Transcription :\n\n${transcript}` }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(cleaned) as CallAnalysis;
  } catch (err) {
    console.error("[call-analysis] analyzeCall failed:", err instanceof Error ? err.message : String(err));
    return {
      ...DEFAULT_ANALYSIS,
      coaching_summary: `Analyse indisponible : ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
