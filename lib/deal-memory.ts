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
  type DealMemoryItem,
} from "./deal-memory-schema";

// Fiche deal tirée d'un call — chantier Deal Execution, étape 1 (26/10/2026).
// Un appel au modèle par call : il remplit les champs de la mémoire du deal
// et lève les alertes que le contenu du call permet de lever, chaque élément
// renvoyant aux numéros de ligne du transcript qui le justifient.

const MODEL = "claude-opus-5-5";
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

1. CHAMPS — pour chaque champ ci-dessous, relève ce qui a RÉELLEMENT été dit pendant le call :
${DEAL_MEMORY_FIELDS.map((f) => `   - "${f.key}" : ${f.definition}.`).join("\n")}

   Règles :
   - Chaque élément est une phrase courte (25 mots maximum), factuelle, qui garde les chiffres, noms et dates exacts.
   - Chaque élément renvoie aux numéros de ligne du passage qui le justifie : "lines": [première, dernière]. Choisis le passage le plus court qui suffit, une ou deux lignes en général, 4 lignes consécutives au plus. Pas de passage, pas d'élément.
   - Rien n'a été dit sur un champ : liste vide. Ne déduis pas, ne complète pas avec ce qui serait probable. Une case vide est une information utile pour le manager ; une case remplie par supposition le trompe.
   - 4 éléments au plus par champ.

2. ALERTES — lève uniquement celles dont tu es certain, parmi :
${DEAL_ALERT_RULES.map((r) => `   - "${r.key}" : ${r.definition}.`).join("\n")}

   Pour chaque alerte : "text" dit en une phrase (25 mots maximum) ce qui la déclenche dans ce call, et "lines" renvoie au passage qui la montre. Pour decideur_absent et prochaine_etape_non_datee, qui constatent une absence, "lines" peut valoir null. Au moindre doute, ne lève pas l'alerte.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"fields": {"douleur": [{"text": "...", "lines": [12, 14]}], "impact": [], ...}, "alerts": [{"rule": "concurrent_evoque", "text": "...", "lines": [30, 31]}]}

Tous les champs listés doivent figurer dans "fields", même vides.`;

export type DealMemoryInput = {
  transcript: string | null;
  turns: { text: string; speaker_id: string }[] | null;
  speakerNames: Record<string, string>;
  commercialName: string | null;
  meetingTitle: string | null;
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
// n'a pas été dit.
export function shapeDealMemory(raw: unknown, lines: TranscriptLine[]): DealMemoryContent {
  const root = (raw && typeof raw === "object" ? raw : {}) as { fields?: unknown; alerts?: unknown };
  const rawFields = (root.fields && typeof root.fields === "object" ? root.fields : {}) as Record<string, unknown>;

  const fields: DealMemoryContent["fields"] = {};
  for (const [key, value] of Object.entries(rawFields)) {
    if (!FIELD_KEYS.has(key) || !Array.isArray(value)) continue;
    const items: DealMemoryItem[] = [];
    for (const entry of value) {
      const e = (entry && typeof entry === "object" ? entry : {}) as { text?: unknown; lines?: unknown };
      const text = cleanText(e.text);
      if (!text) continue;
      const range = resolveRange(e.lines, lines);
      if (!range.verbatim) continue;
      items.push({ text, verbatim: range.verbatim, startMs: range.startMs });
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
    const range = resolveRange(e.lines, lines);
    if (rule.needsQuote && !range.verbatim) continue;
    // Une alerte par règle et par call : deux « concurrent évoqué » disent la
    // même chose au manager, le texte peut citer les deux.
    if (seenRules.has(rule.key)) continue;
    seenRules.add(rule.key);
    alerts.push({ rule: rule.key as DealAlertRuleKey, text, verbatim: range.verbatim, startMs: range.startMs });
  }

  return { fields, alerts };
}

function buildUserPrompt(input: DealMemoryInput, lines: TranscriptLine[]): string {
  return [
    `Commercial : ${input.commercialName ?? "inconnu (déduis-le du transcript)"}`,
    `Titre du rendez-vous : ${input.meetingTitle ?? "inconnu"}`,
    "",
    "Transcript numéroté :",
    lines.map((line, i) => `[${i}] ${line.text}`).join("\n"),
  ].join("\n");
}

async function runRequest(client: Anthropic, model: string, userPrompt: string): Promise<Anthropic.Message> {
  return client.messages.create({
    model,
    // La réflexion compte dans max_tokens sur Opus 5.5.
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

export async function generateDealMemory(input: DealMemoryInput): Promise<DealMemoryContent & { model: string }> {
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
        return { ...shapeDealMemory(parsed, lines), model: message.model };
      }
    } catch {
      // essai suivant
    }
    console.warn(`[deal-memory] JSON inexploitable (essai ${attempt + 1}, stop=${message.stop_reason})`);
  }

  console.error("[deal-memory] réponse brute:", lastRaw.slice(0, 2000));
  throw new Error("Le modèle n'a pas retourné une fiche exploitable.");
}
