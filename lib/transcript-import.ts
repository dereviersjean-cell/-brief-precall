import type { TranscriptJson } from "./recall";

// Parse un transcript fourni à la main (fichier ou collage) vers la même
// forme que celle produite par l'ingestion Recall, pour faire tourner tout le
// pipeline d'analyse sur un call qui n'est pas passé par un bot.
//
// Sans dépendance : importable côté client (pour un aperçu avant envoi)
// comme côté serveur — cf. bug #12.

export type ParsedTranscript = {
  // Texte à plat « Speaker: phrase », ce que consomme analyzeCall.
  text: string;
  // Non-null uniquement quand la source porte de VRAIS horodatages. Un
  // transcript en texte brut ne permet pas d'inventer des durées : sans
  // timings, les métriques d'interaction (ratio de parole, patience, durée
  // des monologues) seraient plausibles mais fabriquées. On préfère ne rien
  // produire — l'analyse, les scores et les objections, eux, marchent très
  // bien sans horodatage.
  transcriptJson: TranscriptJson | null;
  speakerNames: Record<string, string>;
  durationSeconds: number | null;
  hasTimings: boolean;
  format: "vtt" | "srt" | "json" | "text";
};

type Entry = { speaker: string; startMs: number | null; endMs: number | null; text: string };

// « 00:01:23.456 » / « 00:01:23,456 » / « 01:23.4 »
function parseTimestamp(raw: string): number | null {
  const match = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!match) return null;
  const [, hours, minutes, seconds, fraction] = match;
  return (
    (Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000 +
    Number(fraction.padEnd(3, "0"))
  );
}

// « Nom : texte » ou « Nom: texte » en tête de ligne. Le nom doit rester
// court et sans ponctuation de phrase, sinon « Bref, on en reparle : ... »
// serait pris pour un locuteur.
function splitSpeaker(line: string): { speaker: string | null; text: string } {
  const match = line.match(/^\s*([^:]{1,40}?)\s*:\s*(.+)$/);
  if (!match) return { speaker: null, text: line.trim() };
  const [, speaker, text] = match;
  if (/[.!?]/.test(speaker)) return { speaker: null, text: line.trim() };
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
    entries = format === "vtt" || format === "srt" ? parseCueBased(content) : parsePlainText(content);
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

  const hasTimings = merged.length > 0 && merged.every((e) => e.startMs !== null && e.endMs !== null);
  const speakerNames: Record<string, string> = {};
  for (const entry of merged) speakerNames[entry.speaker] = entry.speaker;

  if (!hasTimings) {
    return { text, transcriptJson: null, speakerNames, durationSeconds: null, hasTimings: false, format };
  }

  const turns = merged.map((entry) => ({
    // Le nom sert d'identifiant de locuteur : sans participant Recall, c'est
    // la seule clé stable dont on dispose, et speakerNames la mappe sur
    // elle-même pour que l'affichage reste correct.
    speaker_id: entry.speaker,
    speaker_name_raw: entry.speaker,
    start_ms: entry.startMs as number,
    end_ms: Math.max(entry.startMs as number, entry.endMs as number),
    text: entry.text,
  }));
  const totalDurationMs = turns.reduce((max, turn) => Math.max(max, turn.end_ms), 0);

  return {
    text,
    transcriptJson: { turns, total_duration_ms: totalDurationMs },
    speakerNames,
    durationSeconds: Math.round(totalDurationMs / 1000),
    hasTimings: true,
    format,
  };
}
