import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { DEAL_MEMORY_FIELDS } from "./deal-memory-schema";
import { itemLevel, type ItemsByField, type NextItem } from "./call-objectives";
import type { QualificationKey } from "./deal-rules";

// Les questions du prochain call rédigées sur mesure : une question par
// information à aller chercher, appuyée sur ce que le prospect a déjà dit.
// Un appel par call, à partir de la fiche seule (pas du transcript).
//
// Haiku 5.5 (décision de Jean du 27/10/2026, après comparaison sur 4 deals
// réels) : des questions presque aussi précises que Sonnet, environ 0,0006 $
// par call contre 0,007 $. La fiche, elle, reste à Sonnet : Haiku y jugeait
// trop souvent « confirmé » ce qui n'était qu'évoqué. En cas d'échec, les
// écrans retombent sur les questions fixes de lib/call-objectives.ts.

const MODEL = "claude-haiku-5-5";

const LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));

// Prompt codé en dur : contrat JSON structurel (bug #20).
const SYSTEM_PROMPT = `Tu prépares le prochain rendez-vous d'un commercial B2B français avec un prospect.

On te donne ce que les calls précédents ont appris du deal, et la liste des informations que le commercial doit aller chercher à ce rendez-vous. Pour chacune, écris UNE question que le commercial posera au prospect.

Règles :
- Vouvoiement, ton oral et direct, 30 mots au plus.
- Appuie-toi sur ce que le prospect a déjà dit : reprends ses mots, ses noms, ses chiffres, ses dates. Une information « à préciser » part de ce qui a été dit pour obtenir ce qui manque.
- La question doit amener une réponse précise : un montant ou une fourchette, un nom et un rôle, une date, des étapes.
- N'invente aucun fait, nom ou chiffre absent de ce qu'on te donne.

Réponds UNIQUEMENT en JSON strict : {"questions": {"<clé>": "<question>", ...}} avec exactement les clés demandées.`;

function formatKnown(known: ItemsByField): string {
  return Object.entries(known)
    .flatMap(([key, items]) =>
      (items ?? []).map((i) => `- ${LABELS.get(key) ?? key}${i.level ? ` (${itemLevel(i) === "confirme" ? "confirmé" : "évoqué"})` : ""} : ${i.text}`)
    )
    .join("\n");
}

export async function tailorObjectiveQuestions(input: {
  dealName: string;
  nextRank: number;
  known: ItemsByField;
  items: NextItem[];
  model?: string;
}): Promise<{ questions: Partial<Record<QualificationKey, string>>; inputTokens: number; outputTokens: number; model: string }> {
  if (input.items.length === 0) return { questions: {}, inputTokens: 0, outputTokens: 0, model: input.model ?? MODEL };
  const client = new Anthropic();
  const userPrompt = [
    `Deal : ${input.dealName}. Prochain rendez-vous : R${input.nextRank}.`,
    "",
    "Ce que les calls précédents ont appris :",
    formatKnown(input.known) || "- rien encore",
    "",
    "Informations à aller chercher :",
    ...input.items.map(
      (i) => `- clé "${i.key}" — ${i.label} — ${i.reason === "a_preciser" ? `à préciser (ce qu'on a : ${i.known?.text ?? "?"})` : "jamais abordée"}`
    ),
  ].join("\n");

  const message = await client.messages.create({
    model: input.model ?? MODEL,
    // La réflexion compte dans max_tokens.
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" as const },
    messages: [{ role: "user", content: userPrompt }],
  });
  // Un refus (pas de repli côté serveur sur Haiku) : questions fixes.
  if (message.stop_reason === "refusal") return { questions: {}, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model };
  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const wanted = new Set<string>(input.items.map((i) => i.key));
  const questions: Partial<Record<QualificationKey, string>> = {};
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { questions?: Record<string, unknown> };
    for (const [key, value] of Object.entries(parsed.questions ?? {})) {
      if (!wanted.has(key) || typeof value !== "string" || !value.trim()) continue;
      questions[key as QualificationKey] = `« ${value.trim().replace(/^«\s*|\s*»$/g, "")} »`;
    }
  } catch {
    console.error("[objective-questions] réponse brute:", raw.slice(0, 1000));
  }
  return { questions, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model };
}
