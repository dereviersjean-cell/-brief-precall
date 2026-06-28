import Anthropic from "@anthropic-ai/sdk";

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

  const systemPrompt = `Tu es un expert en vente B2B et coach commercial senior. Ta mission est d'analyser des transcriptions d'appels de vente et de fournir un feedback structuré et actionnable.

Contexte de l'appel :
- Date : ${context.meetingDate}
- Société du commercial : ${context.clientName || "Non renseigné"}${context.clientWebsite ? ` (${context.clientWebsite})` : ""}
- Société du prospect : ${context.prospectName || "Non renseigné"}${context.prospectWebsite ? ` (${context.prospectWebsite})` : ""}

Tu dois évaluer 4 dimensions clés, chacune notée de 0 à 5 :
1. **Ouverture & cadrage** (opening_framing) — Accroche, présentation, création de rapport, cadrage de l'appel
2. **Découverte des besoins** (pain_point) — Qualité des questions, écoute active, identification des douleurs et enjeux
3. **Argumentation & démo** (pitch_demo) — Pertinence des arguments, adaptation au contexte prospect, gestion des objections
4. **Conclusion & suite** (next_step) — Engagement sur des prochaines étapes concrètes, closing, résumé des engagements

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans commentaire :
{
  "global_score": <moyenne des 4 scores arrondie à 1 décimale>,
  "opening_framing": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "pain_point": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "pitch_demo": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "next_step": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "coaching_summary": "<synthèse coaching en 3-4 phrases : ce qui s'est bien passé, ce qui doit changer, conseil clé>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "weaknesses": ["<axe d'amélioration 1>", "<axe d'amélioration 2>"],
  "objections": ["<objection soulevée par le prospect>"],
  "next_steps": ["<prochaine étape concrète convenue>"]
}`;

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
