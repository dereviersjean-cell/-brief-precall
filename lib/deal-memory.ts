import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { reportWarning } from "./monitoring";
import { resolveRange, type TranscriptLine } from "./objection-classifier";
import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  type DealAlertRuleKey,
  type DealMemoryAlert,
  type DealMemoryContent,
  type DealMemoryFieldKey,
  type DealHistoryEntry,
  type DealMemoryItem,
  type QuoteSegment,
} from "./deal-memory-schema";

// Fiche deal tirée d'un call — chantier Deal Execution, étape 1 (26/10/2026).
// Un appel au modèle par call : il remplit les champs de la mémoire du deal
// et lève les alertes que le contenu du call permet de lever, chaque élément
// renvoyant aux numéros de ligne du transcript qui le justifient.

// Sonnet 5.5 plutôt qu'Opus 5.5 : décision de Jean du 27/10/2026, sur le coût.
const MODEL = "claude-sonnet-5-5";
// Même secours que lib/brief-generator.ts : ses classifieurs de sécurité
// peuvent refuser un contenu anodin, Sonnet 4.6 n'en a pas.
const FALLBACK_MODEL = "claude-sonnet-4-6";

const MAX_ITEMS_PER_FIELD = 4;
const MAX_TEXT_LENGTH = 280;

const FIELD_KEYS = new Set<string>(DEAL_MEMORY_FIELDS.map((f) => f.key));
const RULES = new Map<string, (typeof DEAL_ALERT_RULES)[number]>(DEAL_ALERT_RULES.map((r) => [r.key, r]));

// Prompt codé en dur, pas dans admin_config : contrat JSON structurel (même
// raison que lib/objection-classifier.ts, bug #20).
const SYSTEM_PROMPT = `Tu analyses un call commercial B2B en français pour tenir la fiche du deal : ce que le commercial et son manager doivent savoir de ce prospect.

On te donne le transcript complet, lignes numérotées, et le nom du commercial. Toutes les autres personnes sont côté prospect, sauf si le transcript montre clairement le contraire.

On peut aussi te donner l'HISTORIQUE DU DEAL : ce que les calls précédents avec ce prospect ont retenu, avec leur date. Il sert uniquement aux alertes qui comparent ce call aux précédents. Ne recopie jamais un élément de l'historique dans les champs : les champs ne portent que ce qui a été dit dans CE call.

1. CHAMPS — pour chaque champ ci-dessous, relève ce qui a RÉELLEMENT été dit pendant le call :
${DEAL_MEMORY_FIELDS.map((f) => `   - "${f.key}" : ${f.definition}.`).join("\n")}

   Règles :
   - Chaque élément est une phrase courte (25 mots maximum), factuelle, qui garde les chiffres, noms et dates exacts.
   - Chaque élément renvoie aux numéros de ligne du passage qui le justifie : "lines": [première, dernière]. Choisis le passage le plus court qui suffit, une ou deux lignes en général, 4 lignes consécutives au plus. Pas de passage, pas d'élément.
   - Rien n'a été dit sur un champ : liste vide. Ne déduis pas, ne complète pas avec ce qui serait probable. Une case vide est une information utile pour le manager ; une case remplie par supposition le trompe.
   - 4 éléments au plus par champ.
   - Pour "prochaines_etapes" seulement, chaque élément porte aussi "date" : le jour convenu pour cette action au format AAAA-MM-JJ, calculé à partir de la date du call quand elle est relative (« lundi prochain », « dans quinze jours »), ou null si aucun jour n'a été fixé. « Début de semaine prochaine » ou « fin du mois » ne sont pas des jours : null.

2. ALERTES — lève uniquement celles dont tu es certain, parmi :
${DEAL_ALERT_RULES.map((r) => `   - "${r.key}" : ${r.definition}${r.needsHistory ? " (seulement si un historique du deal est fourni)" : ""}.`).join("\n")}

   Pour chaque alerte : "text" dit en une phrase (25 mots maximum) ce qui la déclenche dans ce call, et "lines" renvoie au passage qui la montre. Pour ${DEAL_ALERT_RULES.filter((r) => !r.needsQuote).map((r) => r.key).join(", ")}, qui constatent une absence, "lines" peut valoir null. Une alerte qui compare à l'historique cite dans "text" le call précédent concerné, par sa date. Au moindre doute, ne lève pas l'alerte.

3. ENTREPRISE — "prospect_company" : le nom de l'entreprise du PROSPECT tel qu'il apparaît dans le call, ou null s'il n'est pas dit. Jamais l'entreprise du commercial, même si elle figure dans le titre du rendez-vous (« Antoine x Oliverlist » : Oliverlist est l'entreprise du commercial).

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"prospect_company": "...", "fields": {"douleur": [{"text": "...", "lines": [12, 14]}], "impact": [], "prochaines_etapes": [{"text": "...", "lines": [80, 81], "date": "2026-11-03"}], ...}, "alerts": [{"rule": "concurrent_evoque", "text": "...", "lines": [30, 31]}]}

Tous les champs listés doivent figurer dans "fields", même vides.`;

export type DealMemoryInput = {
  transcript: string | null;
  turns: { text: string; speaker_id: string }[] | null;
  speakerNames: Record<string, string>;
  commercialName: string | null;
  meetingTitle: string | null;
  // Date du call (ISO) : sert à dater les engagements relatifs (« lundi
  // prochain »).
  callAt?: string | null;
  // Les calls précédents du même deal, du plus ancien au plus récent.
  history?: DealHistoryEntry[];
};

// Au-delà, une prise de parole est découpée en plusieurs lignes : la citation
// d'un élément de fiche doit être la phrase qui le justifie, pas le monologue
// de trois minutes qui la contient (constaté sur le premier call testé).
const MAX_LINE_CHARS = 220;

function splitIntoChunks(text: string): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > MAX_LINE_CHARS) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Une ligne par phrase (ou petit groupe de phrases), nom du locuteur en
// tête : les tours horodatés quand ils existent (les noms y sont fiables, cf.
// /api/feedback/[id]/key-points), sinon le texte à plat. La position d'une
// ligne dans l'enregistrement est estimée au prorata des caractères du tour.
export function buildDealMemoryLines(input: Pick<DealMemoryInput, "transcript" | "turns" | "speakerNames">): TranscriptLine[] {
  const turns = (input.turns ?? []) as { text: string; speaker_id: string; start_ms?: number; end_ms?: number }[];
  if (turns.length > 0) {
    return turns.flatMap((t) => {
      const speaker = input.speakerNames[t.speaker_id] || t.speaker_id;
      const chunks = splitIntoChunks(t.text);
      const hasTiming = typeof t.start_ms === "number" && typeof t.end_ms === "number";
      const total = chunks.reduce((n, c) => n + c.length, 0) || 1;
      let offset = 0;
      return chunks.map((chunk) => {
        const at = (share: number) => (hasTiming ? Math.round(t.start_ms! + (t.end_ms! - t.start_ms!) * share) : null);
        const line = { text: `${speaker}: ${chunk}`, startMs: at(offset / total), endMs: at((offset + chunk.length) / total) };
        offset += chunk.length;
        return line;
      });
    });
  }
  return (input.transcript ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (!match || line.length <= MAX_LINE_CHARS) return [line];
      return splitIntoChunks(match[2]).map((chunk) => `${match[1]}: ${chunk}`);
    })
    .map((text) => ({ text, startMs: null, endMs: null }));
}

// Le passage cité, ligne par ligne, regroupé par interlocuteur. Même lecture
// du préfixe que stripSpeakerPrefix (lib/objection-classifier.ts) : un nom
// court, sans ponctuation de phrase, jamais un horodatage.
function quoteSegments(startIndex: number | null, endIndex: number | null, lines: TranscriptLine[]): QuoteSegment[] {
  if (startIndex === null || endIndex === null) return [];
  const segments: QuoteSegment[] = [];
  for (const line of lines.slice(startIndex, endIndex + 1)) {
    const match = line.text.match(/^([^:]{1,40}):\s*(.+)$/);
    const isSpeaker = !!match && !/^\d+$/.test(match[1].trim()) && !/[.!?]/.test(match[1]);
    const speaker = isSpeaker ? match![1].trim() : null;
    const text = (isSpeaker ? match![2] : line.text).trim();
    const last = segments.at(-1);
    if (last && last.speaker === speaker) last.text = `${last.text} ${text}`;
    else segments.push({ speaker, text });
  }
  return segments;
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text;
}

// Met en forme la réponse du modèle. Exportée pour être testée : c'est ici que
// se décide ce que la fiche affirme.
//
// Un élément de fiche doit pouvoir montrer la phrase qui le justifie. Sans
// numéro de ligne valide, il est écarté : le modèle a résumé quelque chose que
// personne n'a dit, ou s'est trompé de passage. Mieux vaut une case vide
// qu'une case remplie par déduction. Seules les alertes d'absence (décideur
// absent, pas de prochaine étape datée) s'en passent : on ne cite pas ce qui
// n'a pas été dit. Les alertes qui comparent aux calls précédents sont
// écartées quand le deal n'avait pas d'historique : elles ne peuvent alors
// rien comparer.
// Une date AAAA-MM-JJ qui existe vraiment, sinon null : le modèle peut
// inventer un 31 novembre ou répondre « lundi ».
export function cleanDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return null;
  const value = raw.trim();
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}

export function shapeDealMemory(raw: unknown, lines: TranscriptLine[], options: { hasHistory?: boolean } = {}): DealMemoryContent {
  const root = (raw && typeof raw === "object" ? raw : {}) as { fields?: unknown; alerts?: unknown };
  const rawFields = (root.fields && typeof root.fields === "object" ? root.fields : {}) as Record<string, unknown>;

  const fields: DealMemoryContent["fields"] = {};
  for (const [key, value] of Object.entries(rawFields)) {
    if (!FIELD_KEYS.has(key) || !Array.isArray(value)) continue;
    const items: DealMemoryItem[] = [];
    for (const entry of value) {
      const e = (entry && typeof entry === "object" ? entry : {}) as { text?: unknown; lines?: unknown; date?: unknown };
      const text = cleanText(e.text);
      if (!text) continue;
      const range = resolveRange(e.lines, lines);
      if (!range.verbatim) continue;
      items.push({
        text,
        verbatim: range.verbatim,
        quote: quoteSegments(range.startIndex, range.endIndex, lines),
        startMs: range.startMs,
        ...(key === "prochaines_etapes" ? { date: cleanDate(e.date) } : {}),
      });
      if (items.length >= MAX_ITEMS_PER_FIELD) break;
    }
    if (items.length > 0) fields[key as DealMemoryFieldKey] = items;
  }

  const alerts: DealMemoryAlert[] = [];
  const seenRules = new Set<string>();
  for (const entry of Array.isArray(root.alerts) ? root.alerts : []) {
    const e = (entry && typeof entry === "object" ? entry : {}) as { rule?: unknown; text?: unknown; lines?: unknown };
    const rule = typeof e.rule === "string" ? RULES.get(e.rule) : undefined;
    const text = cleanText(e.text);
    if (!rule || !text) continue;
    if (rule.needsHistory && !options.hasHistory) continue;
    const range = resolveRange(e.lines, lines);
    if (rule.needsQuote && !range.verbatim) continue;
    // Une alerte par règle et par call : deux « concurrent évoqué » disent la
    // même chose au manager, le texte peut citer les deux.
    if (seenRules.has(rule.key)) continue;
    seenRules.add(rule.key);
    alerts.push({
      rule: rule.key as DealAlertRuleKey,
      text,
      verbatim: range.verbatim,
      ...(range.verbatim ? { quote: quoteSegments(range.startIndex, range.endIndex, lines) } : {}),
      startMs: range.startMs,
    });
  }

  return { fields, alerts };
}

const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

// L'historique tel que le modèle le lit : ce que chaque call précédent a
// retenu, en texte court. Les citations n'y sont pas : elles appartiennent
// aux transcripts précédents, que ce call ne peut pas citer.
export function formatDealHistory(history: DealHistoryEntry[]): string {
  return history
    .map((entry) => {
      const fieldLines = Object.entries(entry.content.fields).flatMap(([key, items]) =>
        (items ?? []).map((item) => `- ${FIELD_LABELS.get(key) ?? key} : ${item.text}`)
      );
      const alertLines = entry.content.alerts.map((a) => `- Alerte « ${RULE_LABELS.get(a.rule) ?? a.rule} » : ${a.text}`);
      return [`Call du ${formatDay(entry.callAt)}${entry.title ? ` (${entry.title})` : ""}`, ...fieldLines, ...alertLines].join("\n");
    })
    .join("\n\n");
}

function buildUserPrompt(input: DealMemoryInput, lines: TranscriptLine[]): string {
  const history = input.history ?? [];
  return [
    `Commercial : ${input.commercialName ?? "inconnu (déduis-le du transcript)"}`,
    `Titre du rendez-vous : ${input.meetingTitle ?? "inconnu"}`,
    `Date du call : ${input.callAt ? new Date(input.callAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) + ` (${input.callAt.slice(0, 10)})` : "inconnue"}`,
    "",
    ...(history.length > 0
      ? [`HISTORIQUE DU DEAL (${history.length} call${history.length > 1 ? "s" : ""} précédent${history.length > 1 ? "s" : ""}) :`, formatDealHistory(history), ""]
      : []),
    "Transcript numéroté :",
    lines.map((line, i) => `[${i}] ${line.text}`).join("\n"),
  ].join("\n");
}

async function runRequest(client: Anthropic, model: string, userPrompt: string): Promise<Anthropic.Message> {
  return client.messages.create({
    model,
    // La réflexion compte dans max_tokens sur Sonnet 5.5.
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    ...(model === MODEL ? { output_config: { effort: "medium" as const } } : {}),
    messages: [{ role: "user", content: userPrompt }],
  });
}

function messageText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function generateDealMemory(
  input: DealMemoryInput
): Promise<DealMemoryContent & { model: string; prospectCompany: string | null }> {
  const lines = buildDealMemoryLines(input);
  if (lines.length === 0) throw new Error("Transcript vide : aucune fiche à tirer de ce call.");

  const client = new Anthropic();
  const userPrompt = buildUserPrompt(input, lines);

  // Deux essais au plus : le second seulement si le JSON est inexploitable.
  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let message = await runRequest(client, MODEL, userPrompt);
    if (message.stop_reason === "refusal") {
      reportWarning("deal-memory.refusal", `Refus du modèle ${MODEL}`, {
        category: message.stop_details?.category ?? null,
      });
      message = await runRequest(client, FALLBACK_MODEL, userPrompt);
    }
    console.log(
      `[deal-memory] ${message.model} stop=${message.stop_reason} in=${message.usage.input_tokens} out=${message.usage.output_tokens}`
    );

    lastRaw = messageText(message);
    try {
      const parsed = JSON.parse(extractJsonObject(lastRaw)) as unknown;
      if (parsed && typeof parsed === "object" && "fields" in parsed) {
        const company = cleanText((parsed as { prospect_company?: unknown }).prospect_company);
        return {
          ...shapeDealMemory(parsed, lines, { hasHistory: (input.history ?? []).length > 0 }),
          model: message.model,
          prospectCompany: company,
        };
      }
    } catch {
      // essai suivant
    }
    console.warn(`[deal-memory] JSON inexploitable (essai ${attempt + 1}, stop=${message.stop_reason})`);
  }

  console.error("[deal-memory] réponse brute:", lastRaw.slice(0, 2000));
  throw new Error("Le modèle n'a pas retourné une fiche exploitable.");
}
