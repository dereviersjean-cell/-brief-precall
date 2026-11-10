import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { reportWarning } from "./monitoring";
import type { TranscriptLine } from "./objection-classifier";
import {
  AUTOFILL_OBJECTS,
  FORECAST_CHECK,
  FORECAST_PROPERTIES,
  OBJECT_LABELS,
  defaultAutofillMode,
  defaultWhat,
  linkId,
  linkType,
  type AutofillLink,
  type AutofillObject,
  type AutofillProperty,
  type ExtractedValue,
  type StageContext,
} from "./hubspot-autofill";

// Les deux lectures par le modèle de la mise à jour automatique de HubSpot
// (lib/hubspot-autofill.ts) :
//   1. au réglage : parmi les propriétés du client, lesquelles un call de
//      vente peut-il remplir, et avec quoi (proposeAutofillLinks) ;
//   2. après chaque call : la valeur de chaque propriété validée, avec les
//      lignes du transcript qui la prouvent (extractAutofillValues).
// Les deux contrats JSON sont figés ici et tout ce qui revient du modèle est
// revérifié par le code (shapeProposal, shapeExtraction) : une propriété
// inconnue ou une valeur sans passage valide ne passe pas.

const MODEL = "claude-sonnet-5-5";
const FALLBACK_MODEL = "claude-sonnet-4-6";

function messageText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// Deux essais au plus : le second seulement si le JSON est inexploitable.
async function askJson(scope: string, system: string, user: string, effort: "low" | "medium"): Promise<unknown> {
  const client = new Anthropic();
  const run = (model: string) =>
    client.messages.create({
      model,
      // La réflexion compte dans max_tokens sur Sonnet 5.5.
      max_tokens: 16000,
      system,
      ...(model === MODEL ? { output_config: { effort } } : {}),
      messages: [{ role: "user", content: user }],
    });
  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let message = await run(MODEL);
    if (message.stop_reason === "refusal") {
      reportWarning(`${scope}.refusal`, `Refus du modèle ${MODEL}`, { category: message.stop_details?.category ?? null });
      message = await run(FALLBACK_MODEL);
    }
    console.log(`[${scope}] ${message.model} stop=${message.stop_reason} in=${message.usage.input_tokens} out=${message.usage.output_tokens}`);
    lastRaw = messageText(message);
    try {
      const parsed = JSON.parse(extractJsonObject(lastRaw)) as unknown;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // essai suivant
    }
    console.warn(`[${scope}] JSON inexploitable (essai ${attempt + 1}, stop=${message.stop_reason})`);
  }
  console.error(`[${scope}] réponse brute:`, lastRaw.slice(0, 2000));
  throw new Error("Le modèle n'a pas retourné une réponse exploitable.");
}

const TYPE_WORDS: Record<string, string> = { string: "texte", number: "nombre", date: "date", datetime: "date", enumeration: "liste", bool: "oui/non" };

function optionWords(p: Pick<AutofillProperty, "options" | "fieldType">, type: string | null): string {
  if (type !== "enumeration" || p.options.length === 0) return "";
  const labels = p.options.slice(0, 25).map((o) => `« ${o.label} »`).join(", ");
  return ` — options${p.fieldType === "checkbox" ? " (plusieurs choix possibles)" : ""} : ${labels}${p.options.length > 25 ? ", …" : ""}`;
}

// ─── 1. Au réglage : la proposition ─────────────────────────────────────────

const PROPOSAL_SYSTEM = `Tu règles la mise à jour automatique d'un CRM HubSpot pour une équipe commerciale B2B. Après chaque call de vente enregistré, un outil (Brief) lit le transcript et remplit des propriétés du deal, du contact et de l'entreprise.

On te donne les propriétés du HubSpot de ce client. Choisis celles qu'un call de vente peut réellement renseigner : ce que le prospect dit de lui (problème, impact, budget, décideur, processus et critères de décision, concurrents, échéances, fonction, effectif, ville, secteur…) ou ce qui est convenu pendant le call (prochaine étape, montant de l'offre, date de signature visée).

Écarte tout le reste : propriétés techniques, de marketing, de facturation, d'attribution, identifiants, scores calculés, dates de suivi interne, propriétaire du deal, type de deal, tout ce qui ne se dit pas dans un call.

Pour chaque propriété gardée :
- "what" : ce que Brief y écrira, en français, 9 mots au plus, sans point final, compréhensible par un directeur commercial (exemples : « Le problème exprimé par le prospect », « La personne qui signe », « Oui ou Non, selon sa présence au call »). Pour une liste, tiens compte de ses options.
- "enabled" : true, sauf si l'information est rarement dite dans un call (source du lead, chiffre d'affaires…) ou si une autre propriété gardée porte déjà la même information sur un autre objet : dans ce cas false.
- "check" : null quand le sens est évident. Sinon la raison, en 8 mots au plus, pour laquelle le manager doit vérifier : sens ambigu, liste dont les options ne se déduisent pas clairement d'un call, doublon (« Existe aussi sur l'entreprise »), « Rarement dite dans un call ».

N'invente aucune propriété : reprends exactement les noms techniques fournis.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"links": [{"object": "deal", "property": "nom_technique", "what": "...", "enabled": true, "check": null}]}
"object" vaut "deal", "contact" ou "company".`;

function proposalPrompt(candidates: Record<AutofillObject, AutofillProperty[]>): string {
  return AUTOFILL_OBJECTS.map((object) => {
    const lines = candidates[object].map((p) => {
      const type = linkType(p);
      const description = p.description.replace(/\s+/g, " ").trim().slice(0, 160);
      return `- ${p.name} — « ${p.label} » (${TYPE_WORDS[type ?? "string"]}${p.custom ? ", créée par le client" : ", standard HubSpot"})${description ? ` : ${description}` : ""}${optionWords(p, type)}`;
    });
    return `PROPRIÉTÉS — ${OBJECT_LABELS[object].toUpperCase()} ("${object}") :\n${lines.join("\n") || "(aucune)"}`;
  }).join("\n\n");
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().replace(/[.。]$/, "").slice(0, max) : "");

// Ce que le modèle propose, ramené à ce qui existe vraiment chez le client.
// Montant, date de clôture, étape du deal et prochaine étape sont toujours
// proposés quand ils sont inscriptibles, que le modèle les ait gardés ou non.
export function shapeProposal(parsed: unknown, candidates: Record<AutofillObject, AutofillProperty[]>): AutofillLink[] {
  const rows = parsed && typeof parsed === "object" && Array.isArray((parsed as { links?: unknown }).links) ? ((parsed as { links: unknown[] }).links) : [];
  const picked = new Map<string, { what: string; enabled: boolean; check: string | null }>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.object !== "deal" && r.object !== "contact" && r.object !== "company") continue;
    const id = `${r.object}.${typeof r.property === "string" ? r.property : ""}`;
    const what = clean(r.what, 120);
    if (!what || picked.has(id)) continue;
    picked.set(id, { what, enabled: r.enabled !== false, check: clean(r.check, 80) || null });
  }
  const links: AutofillLink[] = [];
  for (const object of AUTOFILL_OBJECTS) {
    for (const p of candidates[object]) {
      const type = linkType(p);
      if (!type) continue;
      const id = linkId({ object, property: p.name });
      const forced = object === "deal" && (FORECAST_PROPERTIES.includes(p.name) || p.name === "hs_next_step");
      const pick = picked.get(id);
      if (!pick && !forced) continue;
      const forecast = object === "deal" && FORECAST_PROPERTIES.includes(p.name);
      links.push({
        object,
        property: p.name,
        label: object === "deal" && p.name === "dealstage" ? "Étape du deal" : p.label,
        type,
        what: (forced ? defaultWhat(object, p.name) : null) ?? pick?.what ?? p.label,
        mode: defaultAutofillMode(object, p.name),
        enabled: forced ? true : pick!.enabled,
        check: forecast ? FORECAST_CHECK : pick?.check ?? null,
        example: null,
      });
    }
  }
  return links;
}

export async function proposeAutofillLinks(candidates: Record<AutofillObject, AutofillProperty[]>): Promise<AutofillLink[]> {
  const parsed = await askJson("hubspot-autofill.propose", PROPOSAL_SYSTEM, proposalPrompt(candidates), "low");
  return shapeProposal(parsed, candidates);
}

// ─── 2. Après chaque call : les valeurs ─────────────────────────────────────

const EXTRACTION_SYSTEM = `Tu remplis le CRM HubSpot d'une équipe commerciale à partir du transcript d'un call de vente. On te donne la liste des propriétés à remplir, chacune avec ce qu'il faut y écrire. Pour chaque propriété, relève la valeur si, et seulement si, elle est dite explicitement dans CE call.

RÈGLES
- Une information sur le prospect (problème, impact, budget, décideur, critères, concurrents, échéance, fonction, effectif, ville…) doit être dite ou confirmée par le prospect lui-même. Ce que le commercial suppose ou propose sans que le prospect le confirme ne compte pas.
- Une information sur ce qui est convenu (prochaine étape, montant de l'offre, date de signature visée) doit être dite dans le call et ne pas être refusée par le prospect.
- Rien de déduit, rien de supposé, aucune connaissance extérieure au transcript. Au moindre doute, n'inclus pas la propriété : une propriété laissée vide vaut mieux qu'une propriété fausse.
- "lines" est obligatoire : [début, fin], les numéros de ligne du passage qui prouve la valeur (6 lignes au plus).

FORMATS
- texte : une formulation courte et factuelle, en français, telle qu'un commercial la saisirait dans son CRM (pas de « le prospect dit que », pas de guillemets). Plusieurs éléments : séparés par des virgules.
- nombre : un nombre JSON (7000, pas "7 k€"). Une fourchette ou un ordre de grandeur flou : n'inclus pas la propriété.
- date : "AAAA-MM-JJ". Une date relative (« mardi prochain ») se calcule à partir de la date du call. Une échéance imprécise (« d'ici la fin de l'année », « au printemps ») : n'inclus pas la propriété.
- oui/non : true ou false.
- liste : le libellé exact d'une des options fournies (un tableau de libellés si plusieurs choix sont possibles). Aucune option ne convient clairement : n'inclus pas la propriété.
- Étape du deal : seulement si ce call fait clairement franchir une étape au deal (par exemple, une démonstration est fixée et une étape « Démonstration planifiée » existe). L'étape actuelle est indiquée ; ne propose jamais une étape de clôture.
- Les propriétés du contact ne concernent que le contact indiqué ; celles de l'entreprise, l'entreprise du prospect — jamais celle du commercial.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"values": [{"id": "deal.amount", "value": 7000, "lines": [41, 42]}]}
N'inclus que les propriétés pour lesquelles tu as une valeur sûre. Aucune : {"values": []}.`;

export type ExtractionInput = {
  links: AutofillLink[];
  definitions: Record<AutofillObject, AutofillProperty[]>;
  lines: TranscriptLine[];
  callAt: string | null;
  commercialName: string | null;
  meetingTitle: string | null;
  contact: { name: string | null; email: string | null } | null;
  companyName: string | null;
  stage: StageContext | null;
};

function extractionPrompt(input: ExtractionInput): string {
  const props = input.links.map((l) => {
    const def = input.definitions[l.object].find((p) => p.name === l.property);
    const isStage = l.object === "deal" && l.property === "dealstage";
    const options = isStage
      ? ` — étapes, dans l'ordre : ${(input.stage?.stages ?? []).filter((s) => !s.closed).map((s) => `« ${s.label} »`).join(", ")} ; étape actuelle : « ${input.stage?.stages.find((s) => s.id === input.stage?.currentStageId)?.label ?? "inconnue"} »`
      : def ? optionWords(def, l.type) : "";
    return `- ${linkId(l)} — « ${l.label} » (${OBJECT_LABELS[l.object].toLowerCase()}, ${TYPE_WORDS[l.type]}) : ${l.what}${options}`;
  });
  const contact = input.contact ? [input.contact.name, input.contact.email].filter(Boolean).join(", ") : null;
  return [
    `Commercial : ${input.commercialName ?? "inconnu (déduis-le du transcript)"}`,
    `Titre du rendez-vous : ${input.meetingTitle ?? "inconnu"}`,
    `Date du call : ${input.callAt ? new Date(input.callAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) + ` (${input.callAt.slice(0, 10)})` : "inconnue"}`,
    `Contact HubSpot : ${contact ?? "inconnu"}`,
    `Entreprise du prospect : ${input.companyName ?? "inconnue"}`,
    "",
    "PROPRIÉTÉS À REMPLIR :",
    ...props,
    "",
    "Transcript numéroté :",
    input.lines.map((line, i) => `[${i}] ${line.text}`).join("\n"),
  ].join("\n");
}

// Chaque valeur relevée, avec la seule chose qui lui donne le droit d'être
// écrite : un passage qui existe dans le transcript.
export function shapeExtraction(parsed: unknown, links: AutofillLink[], lineCount: number): Record<string, ExtractedValue> {
  const rows = parsed && typeof parsed === "object" && Array.isArray((parsed as { values?: unknown }).values) ? ((parsed as { values: unknown[] }).values) : [];
  const known = new Set(links.filter((l) => l.enabled).map(linkId));
  const out: Record<string, ExtractedValue> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || !known.has(r.id) || r.id in out) continue;
    const range = r.lines;
    const evidence =
      Array.isArray(range) &&
      range.length === 2 &&
      range.every((n) => typeof n === "number" && Number.isInteger(n)) &&
      (range[0] as number) >= 0 &&
      (range[1] as number) >= (range[0] as number) &&
      (range[1] as number) < lineCount;
    out[r.id] = { value: r.value, evidence };
  }
  return out;
}

export async function extractAutofillValues(input: ExtractionInput): Promise<Record<string, ExtractedValue>> {
  const links = input.links.filter((l) => l.enabled);
  if (links.length === 0 || input.lines.length === 0) return {};
  const parsed = await askJson("hubspot-autofill.extract", EXTRACTION_SYSTEM, extractionPrompt({ ...input, links }), "medium");
  return shapeExtraction(parsed, links, input.lines.length);
}
