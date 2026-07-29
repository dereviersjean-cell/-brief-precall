import type { TranscriptJson } from "./recall";

// Parse un transcript fourni à la main (fichier ou collage) vers la même
// forme que celle produite par l'ingestion Recall, pour faire tourner tout le
// pipeline d'analyse sur un call qui n'est pas passé par un bot.
//
// Sans dépendance : importable côté client (pour un aperçu avant envoi)
// comme côté serveur — cf. bug #12.

// Ce que la source permet réellement de mesurer :
//  · "exact"  — début ET fin de chaque prise de parole (VTT, SRT, JSON) :
//               toutes les métriques d'interaction sont calculables, patience
//               comprise (elle a besoin d'une vraie fin de parole).
//  · "coarse" — début seulement (« 00:45 Nom: … ») : la fin d'un tour est
//               déduite du début du suivant, ce qui est factuel (le locuteur
//               a la parole jusqu'à ce que l'autre reprenne) mais referme
//               mécaniquement tous les silences. Ratio de parole, monologues,
//               interactivité et taux de questions restent valides ; la
//               patience, elle, vaudrait 0 partout et n'est PAS mesurée.
//  · "none"   — aucun horodatage : rien n'est mesuré. On n'estime pas les
//               durées au nombre de mots, cela produirait des chiffres
//               plausibles mais fabriqués.
export type TimingPrecision = "exact" | "coarse" | "none";

export type ParsedTranscript = {
  // Texte à plat « Speaker: phrase », ce que consomme analyzeCall.
  text: string;
  // Null quand timingPrecision vaut "none" — l'analyse, les scores et les
  // objections marchent très bien sans, seules les métriques d'interaction
  // sont concernées.
  transcriptJson: TranscriptJson | null;
  speakerNames: Record<string, string>;
  durationSeconds: number | null;
  timingPrecision: TimingPrecision;
  format: "vtt" | "srt" | "json" | "timestamped" | "text";
};

type Entry = { speaker: string; startMs: number | null; endMs: number | null; text: string };

// « 00:01:23.456 », « 00:01:23,456 », « 01:23.4 » (VTT/SRT) mais aussi
// « 00:45 » et « 01:02:03 » (exports type Google Meet / Zoom, sans fraction).
function parseTimestamp(raw: string): number | null {
  const match = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!match) return null;
  const [, hours, minutes, seconds, fraction] = match;
  return (
    (Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000 +
    (fraction ? Number(fraction.padEnd(3, "0")) : 0)
  );
}

// Horodatage en tête de ligne : « 00:45 Dorian Monaco: Bonjour. »
const LEADING_TIMESTAMP = /^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/;

// « Nom : texte » ou « Nom: texte » en tête de ligne. Le nom doit rester
// court et sans ponctuation de phrase, sinon « Bref, on en reparle : ... »
// serait pris pour un locuteur.
function splitSpeaker(line: string): { speaker: string | null; text: string } {
  const match = line.match(/^\s*([^:]{1,40}?)\s*:\s*(.+)$/);
  if (!match) return { speaker: null, text: line.trim() };
  const [, speaker, text] = match;
  if (/[.!?]/.test(speaker)) return { speaker: null, text: line.trim() };
  // Sur « 00:45 Dorian Monaco: Bonjour », le premier « : » est celui de
  // l'horodatage : sans ce garde-fou, le locuteur retenu serait « 00 » et
  // tout le transcript s'effondrerait sur deux ou trois faux locuteurs.
  // Les appelants retirent l'horodatage avant, ceci est la ceinture.
  if (/^\d+$/.test(speaker.trim())) return { speaker: null, text: line.trim() };
  return { speaker: speaker.trim(), text: text.trim() };
}

function parseCueBased(content: string): Entry[] {
  const entries: Entry[] = [];
  const blocks = content.replace(/^WEBVTT.*$/m, "").split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) continue;

    const arrowIndex = lines.findIndex((l) => l.includes("-->"));
    if (arrowIndex === -1) continue;

    const [rawStart, rawEnd] = lines[arrowIndex].split("-->").map((s) => s.trim().split(/\s+/)[0]);
    const startMs = parseTimestamp(rawStart);
    const endMs = parseTimestamp(rawEnd);

    const body = lines
      .slice(arrowIndex + 1)
      // Balises de style VTT (<v Nom>, <i>…) retirées, sauf <v Nom> dont on
      // récupère le locuteur juste avant.
      .map((l) => l.replace(/<v\s+([^>]+)>/gi, "$1: ").replace(/<[^>]+>/g, ""))
      .join(" ")
      .trim();
    if (!body) continue;

    const { speaker, text } = splitSpeaker(body);
    entries.push({ speaker: speaker ?? "Locuteur inconnu", startMs, endMs, text });
  }

  return entries;
}

// Format « 00:45 Dorian Monaco: Bonjour. » — un horodatage de DÉBUT en tête
// de ligne, suivi du locuteur. C'est ce que sortent Google Meet, Zoom, Fathom
// et la plupart des outils de visio. Les lignes suivantes sans horodatage
// sont la suite de la même prise de parole et lui sont rattachées.
function parseTimestampedText(content: string): Entry[] {
  const entries: Entry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const stamped = line.match(LEADING_TIMESTAMP);
    if (!stamped) {
      // Continuation de la prise de parole en cours. Avant le premier
      // horodatage (en-tête de fichier, titre), il n'y a rien à continuer.
      const last = entries[entries.length - 1];
      if (last) last.text = `${last.text} ${line}`.trim();
      continue;
    }

    const [, rawTimestamp, rest] = stamped;
    const startMs = parseTimestamp(rawTimestamp);
    const { speaker, text } = splitSpeaker(rest);
    if (!text) continue;

    if (speaker) {
      entries.push({ speaker, startMs, endMs: null, text });
    } else {
      // Ligne horodatée sans locuteur : même locuteur que la précédente.
      const last = entries[entries.length - 1];
      if (last) last.text = `${last.text} ${text}`.trim();
      else entries.push({ speaker: "Locuteur inconnu", startMs, endMs: null, text });
    }
  }

  return entries;
}

// Débit de parole français courant, ~150 mots/minute. Sert UNIQUEMENT à
// donner une fin au dernier tour d'un transcript qui n'a que des débuts —
// jamais à fabriquer les durées de tous les tours.
const WORDS_PER_MINUTE = 150;

function estimateSpeechDurationMs(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.round((words / WORDS_PER_MINUTE) * 60_000);
}

function parsePlainText(content: string): Entry[] {
  const entries: Entry[] = [];
  let currentSpeaker = "Locuteur inconnu";

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Horodatage seul sur sa ligne (export type « [00:12] ») : ignoré, il ne
    // suffit pas à reconstruire des durées de prise de parole fiables.
    if (/^\[?\d{1,2}:\d{2}(:\d{2})?\]?$/.test(line)) continue;

    const { speaker, text } = splitSpeaker(line);
    if (speaker) currentSpeaker = speaker;
    if (!text) continue;
    entries.push({ speaker: speaker ?? currentSpeaker, startMs: null, endMs: null, text });
  }

  return entries;
}

// Deux formes JSON acceptées : le transcript brut Recall (tableau de segments
// à `participant`/`words`) et notre propre TranscriptJson ({turns}) — c'est
// ce qu'on exporte, donc ce qu'on doit savoir réimporter.
function parseJson(content: string): Entry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { turns?: unknown }).turns)) {
    const turns = (parsed as TranscriptJson).turns;
    return turns.map((turn) => ({
      speaker: turn.speaker_name_raw ?? turn.speaker_id,
      startMs: turn.start_ms,
      endMs: turn.end_ms,
      text: turn.text,
    }));
  }

  if (!Array.isArray(parsed)) return null;

  const entries: Entry[] = [];
  for (const raw of parsed) {
    const segment = raw as {
      participant?: { id?: unknown; name?: string | null } | null;
      speaker?: string;
      words?: { text?: string; start_timestamp?: { relative?: number | null } | null; end_timestamp?: { relative?: number | null } | null }[];
      text?: string;
      start?: number;
      end?: number;
    };
    const words = segment.words ?? [];
    const text = (words.length > 0 ? words.map((w) => w.text ?? "").join(" ") : segment.text ?? "").trim();
    if (!text) continue;

    const startSeconds = words[0]?.start_timestamp?.relative ?? segment.start ?? null;
    const endSeconds = words[words.length - 1]?.end_timestamp?.relative ?? segment.end ?? null;

    entries.push({
      speaker: segment.participant?.name?.trim() || segment.speaker || String(segment.participant?.id ?? "Locuteur inconnu"),
      startMs: typeof startSeconds === "number" ? Math.round(startSeconds * 1000) : null,
      endMs: typeof endSeconds === "number" ? Math.round(endSeconds * 1000) : null,
      text,
    });
  }
  return entries.length > 0 ? entries : null;
}

function detectFormat(content: string, fileName?: string): ParsedTranscript["format"] {
  const name = (fileName ?? "").toLowerCase();
  const trimmed = content.trimStart();
  if (name.endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) return "json";
  if (name.endsWith(".vtt") || /^WEBVTT/m.test(content)) return "vtt";
  if (name.endsWith(".srt") || /^\d+\s*\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(content)) return "srt";

  // Au moins trois lignes « 00:45 Nom: … » : un seul horodatage isolé peut
  // être une date ou une heure citée dans le corps du texte, trois lignes
  // structurées de la sorte ne sont pas un hasard.
  const timestampedLines = content
    .split(/\r?\n/)
    .filter((line) => LEADING_TIMESTAMP.test(line.trim()) && /:/.test(line.replace(LEADING_TIMESTAMP, "$2")));
  if (timestampedLines.length >= 3) return "timestamped";

  return "text";
}

export function parseTranscript(content: string, fileName?: string): ParsedTranscript {
  let format = detectFormat(content, fileName);
  let entries: Entry[] | null = null;

  if (format === "json") {
    entries = parseJson(content);
    // JSON mal formé ou de forme inconnue : plutôt que d'échouer, on retombe
    // sur le texte brut — l'utilisateur récupère quand même une analyse.
    if (!entries) format = "text";
  }
  if (!entries) {
    entries =
      format === "vtt" || format === "srt"
        ? parseCueBased(content)
        : format === "timestamped"
        ? parseTimestampedText(content)
        : parsePlainText(content);
  }
  if (entries.length === 0) {
    entries = parsePlainText(content);
    format = "text";
  }

  // Fusion des segments consécutifs d'un même locuteur en un tour, comme
  // buildTranscriptJson le fait sur les segments Recall.
  const merged: Entry[] = [];
  for (const entry of entries) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.text = `${last.text} ${entry.text}`.trim();
      if (entry.endMs !== null) last.endMs = entry.endMs;
      if (last.startMs === null) last.startMs = entry.startMs;
    } else {
      merged.push({ ...entry });
    }
  }

  const text = merged.map((e) => `${e.speaker}: ${e.text}`).join("\n");

  const speakerNames: Record<string, string> = {};
  for (const entry of merged) speakerNames[entry.speaker] = entry.speaker;

  const hasStarts = merged.length > 0 && merged.every((e) => e.startMs !== null);
  const hasEnds = hasStarts && merged.every((e) => e.endMs !== null);
  const timingPrecision: TimingPrecision = hasEnds ? "exact" : hasStarts ? "coarse" : "none";

  if (timingPrecision === "none") {
    return { text, transcriptJson: null, speakerNames, durationSeconds: null, timingPrecision, format };
  }

  const turns = merged.map((entry, index) => {
    const startMs = entry.startMs as number;
    // Fin connue (VTT/SRT/JSON) : on la prend telle quelle.
    //
    // Sinon (seuls les débuts sont horodatés) la prise de parole est bornée
    // par DEUX limites, dont on garde la plus courte :
    //  · le début du tour suivant — le locuteur ne peut pas avoir parlé
    //    au-delà ;
    //  · la durée de lecture de son texte à un débit de parole français
    //    courant — sans ce plafond, un blanc de 30 s après une réponse serait
    //    compté comme 30 s de parole, et le ratio parole/écoute créditerait
    //    systématiquement celui qui précède les silences.
    // Le plafond ne fait jamais que RÉDUIRE : il n'invente pas de temps de
    // parole que le transcript ne montre pas.
    const spokenEstimateMs = startMs + estimateSpeechDurationMs(entry.text);
    const endMs =
      entry.endMs ??
      (index + 1 < merged.length
        ? Math.min(merged[index + 1].startMs as number, spokenEstimateMs)
        : spokenEstimateMs);

    return {
      // Le nom sert d'identifiant de locuteur : sans participant Recall, c'est
      // la seule clé stable dont on dispose, et speakerNames la mappe sur
      // elle-même pour que l'affichage reste correct.
      speaker_id: entry.speaker,
      speaker_name_raw: entry.speaker,
      start_ms: startMs,
      end_ms: Math.max(startMs, endMs),
      text: entry.text,
    };
  });
  const totalDurationMs = turns.reduce((max, turn) => Math.max(max, turn.end_ms), 0);

  return {
    text,
    transcriptJson: { turns, total_duration_ms: totalDurationMs },
    speakerNames,
    durationSeconds: Math.round(totalDurationMs / 1000),
    timingPrecision,
    format,
  };
}
