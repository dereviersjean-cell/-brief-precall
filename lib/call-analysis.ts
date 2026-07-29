import Anthropic from "@anthropic-ai/sdk";
import { readPromptConfig, DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT, OBJECTION_DEFINITION } from "./admin-config";
import { DEFAULT_PLAYBOOK_SNAPSHOT } from "./db";
import type { PlaybookSnapshot, CallObjection } from "./db";
import { extractJsonObject } from "./ai-json";

// Dimension keys are dynamic — driven by whatever playbook (org-specific or
// the hardcoded default) was passed to analyzeCall, not a fixed set. See
// lib/db.ts's AnalysisScores for the (backward-compatible) persisted shape.
export type CallAnalysis = {
  scores: {
    global_score: number;
    [dimensionKey: string]: { score: number; description: string } | number;
  };
  sentiment: "positif" | "neutre" | "négatif";
  summary: string;
  strong_points: string[];
  weak_points: string[];
  next_steps: string[];
  objections: CallObjection[];
};

const DEFAULT_ANALYSIS: CallAnalysis = {
  scores: { global_score: 0 },
  sentiment: "neutre",
  summary: "",
  strong_points: [],
  weak_points: [],
  next_steps: [],
  objections: [],
};

// Runtime guard against prompt/contract drift: the system prompt lives in
// admin_config and can be edited (or left stale) independently of this code —
// a drifted prompt once made Claude return a JSON missing strong_points/
// weak_points/scores, which `as CallAnalysis` happily let through and
// persisted as nulls with no error anywhere (the "William" bug). Throwing
// here routes the failure into the catch below: raw response logged, visible
// "Analyse indisponible" fallback instead of silently empty analysis.
function validateCallAnalysisShape(parsed: unknown): CallAnalysis {
  const obj = parsed as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof obj?.scores !== "object" || obj.scores === null || typeof (obj.scores as Record<string, unknown>).global_score !== "number") {
    missing.push("scores.global_score");
  }
  if (typeof obj?.summary !== "string") missing.push("summary");
  if (!Array.isArray(obj?.strong_points)) missing.push("strong_points");
  if (!Array.isArray(obj?.weak_points)) missing.push("weak_points");
  if (!Array.isArray(obj?.next_steps)) missing.push("next_steps");
  if (missing.length > 0) {
    throw new Error(`Réponse IA hors contrat (clés manquantes/invalides : ${missing.join(", ")}) — prompt admin_config probablement périmé`);
  }
  if (!Array.isArray(obj.objections)) obj.objections = [];
  if (obj.sentiment !== "positif" && obj.sentiment !== "neutre" && obj.sentiment !== "négatif") obj.sentiment = "neutre";
  return obj as CallAnalysis;
}

export type AnalyzeContext = {
  clientName: string;
  clientWebsite: string;
  prospectName: string;
  prospectWebsite: string;
  meetingDate: string;
  // Étape R1/R2/R3 détectée depuis le titre du RDV (lib/meeting-stage.ts) —
  // absente/null : analyse générique, comportement historique inchangé.
  meetingStage?: { label: string; guidance: string } | null;
};

function formatPlaybookForPrompt(snapshot: PlaybookSnapshot): string {
  const blocks = snapshot.dimensions.map((dim) => {
    const header = `- ${dim.label} (key: ${dim.key}, poids: ${dim.weight})`;
    if (dim.criteria.length === 0) return header;
    const questions = dim.criteria.map((q) => `  * ${q}`).join("\n");
    return `${header}\n  Questions clés :\n${questions}`;
  });
  return `Dimensions à évaluer :\n${blocks.join("\n")}`;
}

export async function analyzeCall(
  transcript: string,
  context: AnalyzeContext,
  playbookSnapshot: PlaybookSnapshot = DEFAULT_PLAYBOOK_SNAPSHOT
): Promise<CallAnalysis> {
  const client = new Anthropic();

  // The system prompt stays stable/generic (task description + output
  // structure) — the dimensions to score are injected into the user message
  // below, per-call, so a manager editing their playbook doesn't require a
  // prompt edit.
  const systemPrompt = (await readPromptConfig("call_analysis_system_prompt")) ?? DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT;

  // Les consignes d'étape (R1/R2/R3) sont injectées dans le message
  // utilisateur, comme le playbook — jamais dans le system prompt, qui reste
  // le seul endroit où le contrat JSON est forcé (règle « template manager »).
  const stageBlock = context.meetingStage
    ? `\nType de rendez-vous : ${context.meetingStage.label}
Consignes d'évaluation spécifiques à cette étape :
${context.meetingStage.guidance}\n`
    : "";

  const userMessage = `Contexte de l'appel :
- Date : ${context.meetingDate}
- Société du commercial : ${context.clientName || "Non renseigné"}${context.clientWebsite ? ` (${context.clientWebsite})` : ""}
- Société du prospect : ${context.prospectName || "Non renseigné"}${context.prospectWebsite ? ` (${context.prospectWebsite})` : ""}
${stageBlock}
${formatPlaybookForPrompt(playbookSnapshot)}

Transcription :

${transcript}`;

  let raw = "";
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";

    return validateCallAnalysisShape(JSON.parse(extractJsonObject(raw)));
  } catch (err) {
    console.error(
      "[call-analysis] analyzeCall failed:",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return {
      ...DEFAULT_ANALYSIS,
      summary: `Analyse indisponible : ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Narrow, dedicated extraction for the objections backfill
// (scripts/backfill-objections.ts) — a call that already has a good
// call_analysis (scores, summary, etc.) just needs its objections filled in,
// not a full re-analysis that risks producing different scores/summary on a
// second pass and overwriting a perfectly good row. Hardcoded prompt (not
// admin_config-editable), same rationale as lib/key-points.ts: an internal
// extraction task, not manager-facing content.
export async function extractObjectionsFromTranscript(transcript: string): Promise<CallObjection[]> {
  const client = new Anthropic();

  let raw = "";
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: `Tu analyses la transcription d'un call commercial B2B. Identifie chaque objection soulevée par le prospect, avec la réponse effectivement apportée par le commercial dans le transcript. N'invente pas de réponse si le commercial n'a pas répondu — indique alors "Pas de réponse apportée dans ce call.". Liste vide si aucune objection identifiable.

${OBJECTION_DEFINITION}

Réponds UNIQUEMENT en JSON strict, sans markdown, avec la structure :
{ "objections": [{ "objection": "...", "response": "..." }] }`,
      messages: [{ role: "user", content: transcript }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";
    const parsed = JSON.parse(extractJsonObject(raw)) as { objections?: CallObjection[] };
    return parsed.objections ?? [];
  } catch (err) {
    console.error(
      "[call-analysis] extractObjectionsFromTranscript failed:",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return [];
  }
}
