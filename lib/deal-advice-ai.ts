import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { DEAL_ALERT_RULES, DEAL_MEMORY_FIELDS, type AiDealAdvice, type DealMemoryAlert } from "./deal-memory-schema";
import { itemLevel, type ItemsByField } from "./call-objectives";

// Le conseil de Brief rédigé sur mesure après chaque call (demande de Jean du
// 28/10/2026 : « des conseils concrets et actionnables, ça vaut le coup de
// mettre un Haiku là-dessus »). Les règles fixes de lib/deal-advice.ts et
// lib/deal-coaching.ts disaient « Relancer le prospect » ou « Parler du deal
// avec Guislain » : juste, mais rien qu'on puisse faire sans réfléchir. Ici,
// le modèle part de ce que le deal a réellement appris — noms, chiffres,
// dates, engagements, objections — et dit quoi faire, à qui, avec quoi.
//
// Un appel par call, à partir de la fiche (pas du transcript) : Haiku 5.5,
// comme les questions du prochain call (lib/objective-questions.ts). En cas
// d'échec ou de refus, les écrans gardent les conseils fixes.

const MODEL = "claude-haiku-5-5";

const LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const ALERT_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

// Prompt codé en dur : contrat JSON structurel (bug #20).
const SYSTEM_PROMPT = `Tu es un expert de la vente B2B qui conseille un commercial français et son manager sur un deal en cours.

On te donne ce que les calls du deal ont appris (avec le niveau : confirmé ou évoqué), ce qui a été convenu au dernier call, les objections, les alertes, et ce qu'il faut aller chercher au prochain rendez-vous.

Écris trois conseils, tous sur CE deal :

1. "next" — pour le commercial (tutoiement), ce qu'il fait maintenant pour faire avancer le deal :
   - "title" : l'action, à l'impératif, 12 mots au plus, avec son objet précis (qui, quoi). Interdit : un titre qui vaudrait pour n'importe quel deal (« Relancer le prospect », « Préparer le prochain call », « Faire avancer le deal »).
   - "why" : pourquoi maintenant, en t'appuyant sur un fait du deal (une phrase, 35 mots au plus).
   - "steps" : 2 ou 3 étapes concrètes, dans l'ordre, 35 mots au plus chacune : ce qu'il envoie, prépare ou demande, à qui, pour quand. Une phrase à dire au prospect se met entre « » et au vouvoiement.

2. "relance" — si le prospect ne répond plus, pour le commercial. Ce conseil sera lu des jours ou des semaines après le call : les dates convenues seront peut-être passées. Parle-en au passé (« comme convenu le 7 juillet ») et ne propose jamais une date du call comme si elle était à venir ; pour la suite, propose deux créneaux sans date (« mardi ou jeudi prochain »).
   - "title" : l'action, 12 mots au plus, nommant le prospect ou le deal.
   - "why" : ce que le deal perd si la relance n'est pas faite — l'enjeu pour le prospect, la personne qui attend quelque chose —, avec un fait du deal (35 mots au plus). Pas d'échéance du call qui sera passée au moment de la lecture.
   - "message" : le message prêt à envoyer au prospect, au vouvoiement, 70 mots au plus. Il rappelle ce qui a été convenu, apporte quelque chose d'utile (l'élément promis, une réponse à son objection, une option) et propose une suite datée. Pas de « je me permets de revenir vers vous ».

3. "manager" — pour le manager du commercial (on s'adresse au manager sans le tutoyer : titre à l'infinitif) :
   - "title" : ce que le manager fait avec le commercial sur ce deal, à l'infinitif, 12 mots au plus (« Faire préciser à Guislain… »).
   - "why" : le risque ou l'enjeu précis (35 mots au plus).
   - "questions" : 2 ou 3 questions que le manager pose au commercial, au tutoiement, entre « », chacune sur un point précis du deal (une personne, un chiffre, une objection, une date). Le manager ne reprend jamais le deal : il aide le commercial à trouver.

Règles :
- Dans "next" et "relance", tu tutoies le commercial partout (« tes arguments », jamais « vos »), sauf dans les phrases entre « » destinées au prospect.
- Reprends les noms, chiffres, dates et mots du prospect quand ils sont donnés. N'invente aucun fait, nom, chiffre ou date absent de ce qu'on te donne ; s'il manque, dis comment l'obtenir.
- Pas de jargon (pas de « MEDDIC », « champion », « closing ») : écris comme un directeur commercial qui parle à son équipe.

Réponds UNIQUEMENT en JSON strict :
{"next": {"title": "", "why": "", "steps": [""]}, "relance": {"title": "", "why": "", "message": ""}, "manager": {"title": "", "why": "", "questions": [""]}}`;

export type DealAdviceInput = {
  dealName: string;
  commercialName: string | null;
  // Les autres participants du dernier call, tels que nommés au transcript.
  participants: string[];
  rank: number;
  callAt: string | null;
  // Ce que tous les calls du deal ont appris, et ce que le dernier a convenu.
  known: ItemsByField;
  commitments: { text: string; date: string | null }[];
  objections: { objection: string; handlingQuality: string | null }[];
  alerts: DealMemoryAlert[];
  summary: string | null;
  // Le prochain rendez-vous : ce qu'il faut y aller chercher, avec la question.
  nextPlan: { rank: number; items: { label: string; question: string }[] } | null;
  model?: string;
};

function formatKnown(known: ItemsByField): string {
  return Object.entries(known)
    .filter(([key]) => key !== "prochaines_etapes")
    .flatMap(([key, items]) =>
      (items ?? []).map((i) => `- ${LABELS.get(key) ?? key}${i.level ? ` (${itemLevel(i) === "confirme" ? "confirmé" : "évoqué"})` : ""} : ${i.text}`)
    )
    .join("\n");
}

const HANDLING: Record<string, string> = { bien_traitee: "bien traitée", partiellement: "partiellement traitée", non_traitee: "non traitée" };

export function buildAdvicePrompt(input: DealAdviceInput): string {
  return [
    `Deal : ${input.dealName}. Commercial : ${input.commercialName ?? "inconnu"}.`,
    input.participants.length ? `Participants côté prospect au dernier call : ${input.participants.join(", ")}.` : "",
    `Dernier call : R${input.rank}${input.callAt ? `, le ${input.callAt.slice(0, 10)}` : ""}.`,
    input.summary ? `\nRésumé du dernier call :\n${input.summary}` : "",
    "\nCe que les calls du deal ont appris :",
    formatKnown(input.known) || "- rien encore",
    "\nConvenu au dernier call :",
    input.commitments.length ? input.commitments.map((c) => `- ${c.text}${c.date ? ` (date : ${c.date})` : ""}`).join("\n") : "- rien de convenu",
    "\nObjections du dernier call :",
    input.objections.length
      ? input.objections.map((o) => `- ${o.objection}${o.handlingQuality ? ` — ${HANDLING[o.handlingQuality] ?? o.handlingQuality}` : ""}`).join("\n")
      : "- aucune",
    "\nAlertes du dernier call :",
    input.alerts.length ? input.alerts.map((a) => `- ${ALERT_LABELS.get(a.rule) ?? a.rule} : ${a.text}`).join("\n") : "- aucune",
    input.nextPlan && input.nextPlan.items.length
      ? `\nÀ aller chercher au R${input.nextPlan.rank} :\n${input.nextPlan.items.map((i) => `- ${i.label} — question prévue : ${i.question}`).join("\n")}`
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function quoted(value: string): string {
  return `« ${value.replace(/^«\s*|\s*»$/g, "").replace(/^"|"$/g, "")} »`;
}

function list(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value
        .map((v) => text(v, 400))
        .filter((v): v is string => v !== null)
        .slice(0, max)
    : [];
}

// La forme vérifiée de la réponse ; null si un des trois conseils manque
// (l'écran garde alors les conseils fixes, plutôt qu'un conseil à trous).
export function parseAdvice(raw: string, model: string, generatedAt: string): AiDealAdvice | null {
  let parsed: Record<string, Record<string, unknown> | undefined>;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return null;
  }
  const next = parsed.next ?? {};
  const relance = parsed.relance ?? {};
  const manager = parsed.manager ?? {};
  const advice = {
    next: { title: text(next.title, 140), why: text(next.why, 400), steps: list(next.steps, 3) },
    relance: { title: text(relance.title, 140), why: text(relance.why, 400), message: text(relance.message, 900) },
    manager: { title: text(manager.title, 140), why: text(manager.why, 400), questions: list(manager.questions, 3).map(quoted) },
  };
  if (!advice.next.title || !advice.next.why || advice.next.steps.length === 0) return null;
  if (!advice.relance.title || !advice.relance.why || !advice.relance.message) return null;
  if (!advice.manager.title || !advice.manager.why || advice.manager.questions.length === 0) return null;
  return {
    next: { title: advice.next.title, why: advice.next.why, steps: advice.next.steps },
    relance: { title: advice.relance.title, why: advice.relance.why, message: quoted(advice.relance.message) },
    manager: { title: advice.manager.title, why: advice.manager.why, questions: advice.manager.questions },
    model,
    generatedAt,
  };
}

export async function writeDealAdvice(
  input: DealAdviceInput
): Promise<{ advice: AiDealAdvice | null; inputTokens: number; outputTokens: number; model: string }> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: input.model ?? MODEL,
    // La réflexion compte dans max_tokens.
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low" as const },
    messages: [{ role: "user", content: buildAdvicePrompt(input) }],
  });
  const usage = { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, model: message.model };
  // Un refus (pas de repli côté serveur sur Haiku) : conseils fixes.
  if (message.stop_reason === "refusal") return { advice: null, ...usage };
  const raw = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const advice = parseAdvice(raw, message.model, new Date().toISOString());
  if (!advice) console.error("[deal-advice-ai] réponse brute:", raw.slice(0, 1500));
  return { advice, ...usage };
}
