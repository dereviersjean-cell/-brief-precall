import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import type { AiPersonAdvice } from "./deal-memory-schema";
import type { DealProgress } from "./deal-progress";

// Le conseil de Brief sur un commercial, pour son manager (demande de Jean du
// 28/10/2026, après le conseil par deal de lib/deal-advice-ai.ts) : le
// bandeau de l'onglet Équipe quand on clique sur un commercial. Les règles
// fixes de lib/deal-coaching.ts (personAdvice) disaient « Travailler avec
// Guislain : décideur toujours pas rencontré » et listaient ses deals à
// relancer ; ici, Haiku lit tous ses deals en cours et nomme ce qui revient,
// deal par deal, avec les faits.
//
// Un appel Haiku 5.5 après chaque call du commercial (réécrit à chaque fois),
// à partir des deals déjà calculés : pas de transcript. En cas d'échec, le
// bandeau garde les règles fixes.

const MODEL = "claude-haiku-5-5";

// Prompt codé en dur : contrat JSON structurel (bug #20).
const SYSTEM_PROMPT = `Tu es un expert de la vente B2B qui prépare le point d'un manager avec un de ses commerciaux.

On te donne tous les deals en cours du commercial : où en est chacun, ce qui manque, les alertes du dernier call, et le conseil déjà rédigé pour chaque deal.

Écris le conseil au manager sur CE commercial :
- "title" : ce que le manager travaille avec lui, à l'infinitif, 14 mots au plus, avec le prénom du commercial et le point précis (pas « Faire le point », pas « Accompagner »).
- "why" : ce qui revient d'un deal à l'autre, en citant les deals concernés par leur nom et un fait précis de chacun (un nom, un chiffre, une objection, une durée sans call). 2 phrases, 55 mots au plus. Si rien ne revient, le deal le plus à risque et pourquoi.
- "questions" : 2 ou 3 questions que le manager pose au commercial, au tutoiement, entre « », chacune sur un deal ou une personne précise. Le manager ne reprend jamais les deals : il aide le commercial à trouver lui-même.

Règles :
- On s'adresse au manager sans le tutoyer ; seules les questions tutoient le commercial.
- Une étape convenue dont la date est passée (date du jour donnée) se dit au passé : elle a eu lieu ou pas, tu ne le sais pas — demande-le.
- Ne reproche pas au commercial son nombre de calls de la semaine : c'est un repère, pas un fait du deal.
- N'invente aucun fait, nom, chiffre ou date absent de ce qu'on te donne.
- Pas de jargon (pas de « MEDDIC », « champion », « closing »).

Réponds UNIQUEMENT en JSON strict : {"title": "", "why": "", "questions": [""]}`;

const STATUS: Record<DealProgress["focus"]["status"], string> = { relancer: "à relancer", traiter: "à traiter", bonne_voie: "en bonne voie" };
const VERDICT: Record<DealProgress["verdict"], string> = { progres: "en progrès", arret: "à l'arrêt", recul: "en recul" };

export function buildPersonPrompt(input: { name: string; deals: DealProgress[]; week: number; today?: string }): string {
  const lines = [
    `Date du jour : ${input.today ?? new Date().toISOString().slice(0, 10)}.`,
    `Commercial : ${input.name}. Calls ces 7 derniers jours : ${input.week}.`,
    `Deals en cours : ${input.deals.length}.`,
    "",
  ];
  for (const d of input.deals) {
    const ai = d.aiAdvice;
    lines.push(
      `## ${d.name}`,
      `- ${d.steps.length} call${d.steps.length > 1 ? "s" : ""}, ${STATUS[d.focus.status]}, ${VERDICT[d.verdict]}${d.idleDays !== null ? `, dernier call il y a ${d.idleDays} jours` : ""}`,
      `- Informations clés : ${d.known}/${d.total}${d.toObtain.length ? ` ; manque : ${d.toObtain.join(", ")}` : ""}`,
      d.alerts.length ? `- Alertes du dernier call : ${d.alerts.join(", ")}` : "- Pas d'alerte au dernier call",
      d.nextStep.text
        ? `- Prochaine étape convenue : ${d.nextStep.text}${d.nextStep.date ? ` (${d.nextStep.date})` : ""}`
        : "- Aucune prochaine étape convenue",
      ai ? `- Conseil du deal : ${ai.manager.title}. ${ai.manager.why}` : `- Action : ${d.focus.action}`,
      ""
    );
  }
  return lines.join("\n");
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

// La forme vérifiée ; null si un morceau manque (le bandeau garde alors les
// règles fixes).
export function parsePersonAdvice(raw: string, model: string, generatedAt: string): AiPersonAdvice | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return null;
  }
  const title = text(parsed.title, 160);
  const why = text(parsed.why, 600);
  const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
    .map((q) => text(q, 400))
    .filter((q): q is string => q !== null)
    .slice(0, 3)
    .map((q) => `« ${q.replace(/^«\s*|\s*»$/g, "").replace(/^"|"$/g, "")} »`);
  if (!title || !why || questions.length === 0) return null;
  return { title, why, questions, model, generatedAt };
}

export async function writePersonAdvice(input: {
  name: string;
  deals: DealProgress[];
  week: number;
  model?: string;
}): Promise<{ advice: AiPersonAdvice | null; inputTokens: number; outputTokens: number }> {
  if (input.deals.length === 0) return { advice: null, inputTokens: 0, outputTokens: 0 };
  const client = new Anthropic();
  const message = await client.messages.create({
    model: input.model ?? MODEL,
    // La réflexion compte dans max_tokens.
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" as const },
    messages: [{ role: "user", content: buildPersonPrompt(input) }],
  });
  const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
  if (message.stop_reason === "refusal") return { advice: null, ...usage };
  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const advice = parsePersonAdvice(raw, message.model, new Date().toISOString());
  if (!advice) console.error("[person-advice-ai] réponse brute:", raw.slice(0, 1500));
  return { advice, ...usage };
}
