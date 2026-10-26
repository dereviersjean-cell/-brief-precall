"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Search, Pencil } from "lucide-react";
import type { CallWithAnalysis, DealMemoryPanel } from "@/lib/db";
import { MEETING_STAGE_LABELS } from "@/lib/meeting-stage";
import type { ConversationAnalytics } from "@/lib/transcript-analytics";
import { getEffectiveScoresForDisplay } from "@/lib/playbook-scores";
import { formatContactDisplayName } from "@/lib/format";
import { isValidEmail } from "@/lib/email-address";
import { useModules } from "@/app/components/ModulesProvider";
import ConversationAnalyticsBlock from "./ConversationAnalyticsBlock";
import KeyPointsBlock from "./KeyPointsBlock";
import DealMemoryBlock from "./DealMemoryBlock";
import SpeakerTimelineBlock from "./SpeakerTimelineBlock";

// Étiquette de section et carte, reprises du site (AnalysisObject).
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type TranscriptTurn = { speaker: string; text: string };

// Mirrors transcriptToText's own format (lib/recall.ts): one turn per line,
// "Speaker: text". Split on the first ": " only — a speaker name never
// contains one, but their spoken text often does. transcriptToText only
// ever joins each segment's word text — it discards Recall's per-word
// start_timestamp/end_timestamp entirely — so nothing here can recover a
// per-turn timestamp; confirmed against several real stored transcripts,
// none contain one in any form. Nothing is rendered for it as a result.
function parseTranscript(raw: string): TranscriptTurn[] {
  return raw
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(": ");
      return idx === -1 ? { speaker: "", text: line } : { speaker: line.slice(0, idx), text: line.slice(idx + 2) };
    })
    .filter((turn) => turn.text.trim().length > 0);
}

// Wraps every case-insensitive occurrence of `query` in `text` with a
// highlight span, preserving the original casing of the matched substring.
function highlightMatches(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchAt = lowerText.indexOf(lowerQuery, cursor);
  let key = 0;

  while (matchAt !== -1) {
    if (matchAt > cursor) parts.push(text.slice(cursor, matchAt));
    parts.push(
      <span key={key++} className="rounded-sm bg-[color:var(--warning-soft)] text-slate-900">
        {text.slice(matchAt, matchAt + trimmed.length)}
      </span>
    );
    cursor = matchAt + trimmed.length;
    matchAt = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

type ResolvedTurn = {
  // null for turns derived from the legacy flat-text fallback — there's no
  // stable id to key an edit against there, so no pencil icon for those, and
  // no startMs to seek the video to.
  speakerId: string | null;
  displayName: string;
  text: string;
  startMs: number | null;
  endMs: number | null;
};

// transcript_json (sous-étape A) takes priority when present — it carries
// real per-turn timestamps and a stable speaker_id the user can rename via
// the pencil icon. Historical calls ingested before it existed have
// transcript_json: null, so this falls back to parsing the flat `transcript`
// column instead (no timestamps possible there — see parseTranscript above).
function resolveTurns(call: CallWithAnalysis): ResolvedTurn[] {
  if (call.transcript_json && call.transcript_json.turns.length > 0) {
    return call.transcript_json.turns.map((t) => ({
      speakerId: t.speaker_id,
      displayName: call.speaker_names_override[t.speaker_id] || t.speaker_id,
      text: t.text,
      startMs: t.start_ms,
      endMs: t.end_ms,
    }));
  }
  if (call.transcript) {
    return parseTranscript(call.transcript).map((t) => ({
      speakerId: null,
      displayName: t.speaker || "Inconnu",
      text: t.text,
      startMs: null,
      endMs: null,
    }));
  }
  return [];
}

const SPEAKER_TIP_DISMISSED_KEY = "brief:transcript-speaker-tip-dismissed";

// Lives in its own « Transcript » tab (13/10/2026), as a readable
// conversation — turns/overrideMap are resolved once by the parent
// (FeedbackDetailClient) since SpeakerTimelineBlock needs the exact same
// data. onSeek/seekable/currentTimeMs wire the video sync: click a row to
// jump the video there, and the row matching current playback position gets
// highlighted + scrolled into view automatically.
function TranscriptSection({
  callId,
  turns,
  overrideMap,
  onOverrideMapChange,
  onSeek,
  seekable,
  currentTimeMs,
}: {
  callId: string;
  turns: ResolvedTurn[];
  overrideMap: Record<string, string>;
  onOverrideMapChange: (next: Record<string, string>) => void;
  onSeek: (ms: number) => void;
  seekable: boolean;
  currentTimeMs: number | null;
}) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showTip, setShowTip] = useState(false);
  const activeRowRef = useRef<HTMLLIElement>(null);

  const hasTimestamps = turns.some((t) => t.startMs !== null);

  useEffect(() => {
    if (!hasTimestamps) return;
    setShowTip(window.localStorage.getItem(SPEAKER_TIP_DISMISSED_KEY) !== "1");
  }, [hasTimestamps]);

  function dismissTip() {
    setShowTip(false);
    window.localStorage.setItem(SPEAKER_TIP_DISMISSED_KEY, "1");
  }

  const trimmedQuery = query.trim();
  const filteredTurns = trimmedQuery
    ? turns.filter((turn) => `${turn.displayName} ${turn.text}`.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : turns;

  // Last turn whose startMs is at or before the current playback position —
  // only meaningful while actively playing back (currentTimeMs !== null) and
  // when not filtering (a search result list has no coherent "current" row).
  const activeIndex =
    currentTimeMs !== null && !trimmedQuery
      ? filteredTurns.reduce((best, t, i) => (t.startMs !== null && t.startMs <= currentTimeMs ? i : best), -1)
      : -1;

  useEffect(() => {
    if (activeIndex === -1) return;
    activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  function handleCopy() {
    const text = hasTimestamps ? turns.map((t) => `${t.displayName}: ${t.text}`).join("\n") : turns.map((t) => t.text).join("\n");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startEditing(turn: ResolvedTurn) {
    if (!turn.speakerId) return;
    setEditingSpeakerId(turn.speakerId);
    setEditDraft(overrideMap[turn.speakerId] ?? turn.speakerId);
  }

  async function commitEdit() {
    const speakerId = editingSpeakerId;
    setEditingSpeakerId(null);
    if (!speakerId) return;
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === overrideMap[speakerId]) return;

    const previous = overrideMap;
    const next = { ...overrideMap, [speakerId]: trimmed };
    onOverrideMapChange(next);
    try {
      const res = await fetch(`/api/feedback/${callId}/speaker-names`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker_names: next }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { speaker_names: Record<string, string> };
      onOverrideMapChange(data.speaker_names);
    } catch {
      onOverrideMapChange(previous);
    }
  }

  // Une couleur par intervenant, rangés par temps de parole (ou par nombre
  // d'interventions sans horodatage) : les mêmes que la frise du bandeau.
  const speakerStats = new Map<string, { name: string; ms: number; count: number }>();
  for (const t of turns) {
    const key = t.speakerId ?? t.displayName;
    const row = speakerStats.get(key) ?? { name: t.displayName, ms: 0, count: 0 };
    row.name = t.displayName;
    row.ms += t.startMs !== null && t.endMs !== null ? t.endMs - t.startMs : 0;
    row.count += 1;
    speakerStats.set(key, row);
  }
  const speakers = Array.from(speakerStats.entries()).sort((a, b) => b[1].ms - a[1].ms || b[1].count - a[1].count);
  const totalMs = speakers.reduce((sum, [, v]) => sum + v.ms, 0);
  const colorOf = (turn: ResolvedTurn) => {
    const i = speakers.findIndex(([key]) => key === (turn.speakerId ?? turn.displayName));
    return TRANSCRIPT_COLORS[Math.max(i, 0) % TRANSCRIPT_COLORS.length];
  };

  return (
    <div className={`${CARD} overflow-hidden`}>
      {/* Barre d'outils : recherche, copie, et les intervenants avec leur
          temps de parole. */}
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher dans le transcript…"
              disabled={turns.length === 0}
              className="h-10 w-full rounded-full border border-border bg-white pl-9 pr-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] disabled:bg-slate-50"
            />
          </div>
          <button
            onClick={handleCopy}
            disabled={turns.length === 0}
            className="h-10 shrink-0 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            {copied ? "✓ Copié" : "📋 Copier"}
          </button>
        </div>
        {turns.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {speakers.map(([key, v], i) => (
              <span key={key} className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-semibold ${TRANSCRIPT_COLORS[i % TRANSCRIPT_COLORS.length]}`}>
                  {speakerInitials(v.name)}
                </span>
                {v.name}
                {totalMs > 0 && <span className="tabular-nums text-slate-400">{Math.round((100 * v.ms) / totalMs)} %</span>}
              </span>
            ))}
            <span className="ml-auto text-[12.5px] tabular-nums text-slate-400">
              {trimmedQuery
                ? `${filteredTurns.length} résultat${filteredTurns.length !== 1 ? "s" : ""} trouvé${filteredTurns.length !== 1 ? "s" : ""}`
                : `${turns.length} tour${turns.length !== 1 ? "s" : ""} de parole`}
            </span>
          </div>
        )}
        {showTip && hasTimestamps && (
          <p className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[color:var(--violet)]">
            <span>Cliquez sur un nom pour le corriger, ou sur une ligne pour aller à ce moment de la vidéo</span>
            <button onClick={dismissTip} className="shrink-0 text-[color:var(--violet)] opacity-70 transition-opacity hover:opacity-100">
              ✕
            </button>
          </p>
        )}
      </div>

      {turns.length === 0 ? (
        <p className="px-6 py-10 text-center text-[14px] text-slate-400">Transcript non disponible</p>
      ) : (
        <ol className="divide-y divide-border/60">
          {filteredTurns.map((turn, i) => {
            const isActive = i === activeIndex;
            const canSeek = seekable && turn.startMs !== null;
            return (
              <li
                key={i}
                ref={isActive ? activeRowRef : undefined}
                onClick={canSeek ? () => onSeek(turn.startMs as number) : undefined}
                className={`flex gap-3.5 px-5 py-4 transition-colors sm:px-6 ${
                  isActive ? "bg-[color:var(--lavender)]" : ""
                } ${canSeek ? "cursor-pointer hover:bg-slate-50" : ""}`}
              >
                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold ${colorOf(turn)}`}>
                  {speakerInitials(turn.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* `editingSpeakerId !== null` : un transcript en texte brut
                          (call importé, sans transcript_json) n'a pas
                          d'identifiant d'intervenant. Sans cette garde,
                          null === null ouvrait un champ vide à chaque tour
                          de parole à la place du nom. */}
                      {editingSpeakerId !== null && editingSpeakerId === turn.speakerId ? (
                        <input
                          autoFocus
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingSpeakerId(null);
                          }}
                          onBlur={commitEdit}
                          className="rounded-md border border-[color:var(--lavender-strong)] bg-white px-2 py-0.5 text-[13.5px] font-semibold text-slate-900 outline-none focus:border-[color:var(--violet)]"
                        />
                      ) : (
                        <>
                          <span className="truncate text-[13.5px] font-semibold text-slate-900">{turn.displayName}</span>
                          {turn.speakerId && (
                            <button
                              onClick={() => startEditing(turn)}
                              title="Corriger le nom du speaker"
                              className="shrink-0 text-slate-300 transition-colors hover:text-slate-500"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {turn.startMs !== null && (
                      <span className={`shrink-0 text-[12px] tabular-nums ${canSeek ? "text-[color:var(--violet)]" : "text-slate-400"}`}>
                        {formatDuration(Math.floor(turn.startMs / 1000))}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-slate-700">{highlightMatches(turn.text, query)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Pastilles des intervenants du transcript : même ordre de couleurs que la
// frise « qui a parlé » (SpeakerTimelineBlock).
const TRANSCRIPT_COLORS = [
  "bg-[color:var(--violet)] text-white",
  "bg-slate-700 text-white",
  "bg-[color:var(--warning)] text-white",
  "bg-teal-500 text-white",
  "bg-[color:var(--danger)] text-white",
  "bg-slate-400 text-white",
];

function speakerInitials(name: string): string {
  const parts = name.replace(/[^\p{L}\s-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function ScoreBar({
  score,
  label,
  description,
  weight,
}: {
  score: number;
  label: string;
  description?: string;
  weight?: number;
}) {
  const pct = Math.round((score / 5) * 100);
  const color =
    score >= 4 ? "bg-[color:var(--success)]" : score >= 2.5 ? "bg-[color:var(--warning)]" : "bg-[color:var(--danger)]";
  const textColor =
    score >= 4 ? "text-emerald-700" : score >= 2.5 ? "text-amber-700" : "text-rose-700";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="min-w-0 text-[13.5px] font-medium text-slate-900">
          {label}
          {weight != null && weight !== 1 && (
            <span className="ml-1.5 whitespace-nowrap text-[12px] font-normal tabular-nums text-slate-400">
              poids {weight}
            </span>
          )}
        </span>
        <span className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${textColor}`}>{score}/5</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}

// Classes écrites en entier : Tailwind ne génère que celles qu'il lit.
const DOT: Record<string, string> = {
  "text-[color:var(--success)]": "bg-[color:var(--success)]",
  "text-[color:var(--warning)]": "bg-[color:var(--warning)]",
};

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (items.length === 0) return <p className="text-slate-400 text-[13.5px]">Aucun élément.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          {/* Puces en pastilles de couleur, comme dans le brief ; la flèche
              reste pour les prochaines étapes. */}
          {icon === "→" ? (
            <span className={`w-3.5 shrink-0 text-center text-[13px] font-semibold leading-relaxed ${color}`}>{icon}</span>
          ) : (
            <span aria-hidden className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[color] ?? "bg-slate-400"}`} />
          )}
          <span className="text-[13.5px] text-slate-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

type DealOutcomeInfo = { outcome: "won" | "lost"; source: "quote" | "hubspot" | "pipedrive"; closedAt: string | null };
type SimilarObjection = { id: string; objection: string; response: string; outcome: DealOutcomeInfo | null };

function OutcomeBadge({ outcome }: { outcome: DealOutcomeInfo | null }) {
  if (!outcome) return null;
  const isWon = outcome.outcome === "won";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isWon ? "bg-[color:var(--success-soft)] text-emerald-700" : "bg-[color:var(--danger-soft)] text-rose-700"
      }`}
    >
      {isWon ? "✓ Deal gagné" : "✕ Deal perdu"}
      {outcome.source === "quote" ? " (devis)" : " (CRM)"}
    </span>
  );
}

// Fetches on demand (not preloaded with the page) — most objections are
// never expanded, no reason to pay for an embedding + RPC call on every
// feedback page load. Local expand/loading/result state per item, not lifted
// to the parent — each objection's "cas similaires" search is independent.
function ObjectionItem({ objection, response, trainingEnabled }: { objection: string; response: string; trainingEnabled: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [similar, setSimilar] = useState<SimilarObjection[] | null>(null);
  const [error, setError] = useState(false);

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (similar !== null || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/objections/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: objection }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { similar: SimilarObjection[] };
      setSimilar(data.similar ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border p-4">
      <blockquote className="border-l-2 border-border pl-3 text-[13.5px] italic leading-relaxed text-slate-600">
        {objection}
      </blockquote>
      <p className="mt-2.5 flex items-start gap-2 text-[13.5px] leading-relaxed text-slate-900">
        <span className="shrink-0 text-slate-400">↳</span>
        <span>{response}</span>
      </p>
      <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={handleToggle}
          className="text-[12.5px] font-medium text-[color:var(--violet)] hover:underline"
        >
          {expanded ? "Masquer les cas similaires" : "Voir des cas similaires déjà traités"}
        </button>
        {trainingEnabled && (
          <Link
            href={`/training?objection=${encodeURIComponent(objection)}`}
            className="text-[12.5px] text-[color:var(--violet)] font-medium hover:underline"
          >
            M&apos;entraîner sur cette objection →
          </Link>
        )}
      </span>
      {expanded && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-[12.5px] text-slate-400">Recherche en cours…</p>}
          {error && <p className="text-[12.5px] text-rose-700">Recherche indisponible pour le moment.</p>}
          {similar && similar.length === 0 && !loading && !error && (
            <p className="text-[12.5px] text-slate-400">Aucun cas similaire trouvé pour l&apos;instant.</p>
          )}
          {similar?.map((s) => (
            <div key={s.id} className="rounded-xl bg-slate-50 px-3.5 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] text-slate-900 font-medium leading-relaxed">{s.objection}</p>
                <OutcomeBadge outcome={s.outcome} />
              </div>
              <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1">↳ {s.response}</p>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

type SendStatus = "idle" | "sending" | "sent" | "error" | "auth-error";
type VideoStatus = "idle" | "loading" | "ready" | "unavailable";

function formatSentAt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

// Only rendered when recall_bot_id + recording_id aren't both present — see the
// call site, which shows the real video player instead once both exist (the
// manager-facing video-url API now authorizes a manager rattaché au propriétaire).
function readOnlyVideoMessage(call: CallWithAnalysis): string {
  return !call.recall_bot_id
    ? "Aucun bot n'a été programmé pour cet appel."
    : "L'enregistrement n'a pas pu être récupéré (bot refusé ou échec technique).";
}

function ReadOnlyVideoStatus({ call }: { call: CallWithAnalysis }) {
  const message = readOnlyVideoMessage(call);

  return (
    <div className={`${CARD} p-5`}>
      <h2 className={`${LABEL} mb-2`}>Enregistrement</h2>
      <p className="text-[13.5px] text-slate-500">{message}</p>
    </div>
  );
}

function ReadOnlyEmailBlock({ call }: { call: CallWithAnalysis }) {
  // Même présentation que le rédacteur, sans les champs ni les actions.
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50 px-5 py-3 sm:px-6">
        <h2 className={LABEL}>Email de suivi</h2>
        {call.follow_up_sent_at && (
          <span className="rounded-full bg-[color:var(--success-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">Envoyé le {formatSentAt(call.follow_up_sent_at)}</span>
        )}
      </div>
      {call.follow_up_email ? (
        <>
          <div className="divide-y divide-border border-b border-border">
            {call.contact_email && (
              <div className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                <span className="w-14 shrink-0 text-[13px] text-slate-400">À</span>
                <span className="truncate text-[14px] text-slate-800">{call.contact_email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
              <span className="w-14 shrink-0 text-[13px] text-slate-400">Objet</span>
              <span className="text-[14.5px] font-semibold text-slate-900">{call.follow_up_email.subject}</span>
            </div>
          </div>
          <p className="whitespace-pre-wrap px-5 py-4 text-[15px] leading-[1.7] text-slate-800 sm:px-6">{call.follow_up_email.body}</p>
        </>
      ) : (
        <p className="px-6 py-10 text-center text-[14px] text-slate-400">Aucun email de suivi généré.</p>
      )}
    </div>
  );
}

type Tab = "overview" | "email" | "transcript" | "deal";

export default function FeedbackDetailClient({
  call,
  analytics,
  readOnly = false,
  backHref = "/feedback",
  backLabel = "Retour aux feedbacks",
  initialTab = "overview",
  dealMemory = null,
}: {
  call: CallWithAnalysis;
  analytics: ConversationAnalytics | null;
  readOnly?: boolean;
  backHref?: string;
  backLabel?: string;
  initialTab?: Tab;
  /** Fiche deal (Deal Execution, phase de test) : null = le lecteur ne la voit pas. */
  dealMemory?: DealMemoryPanel | null;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { isEnabled: isModuleEnabled } = useModules();
  const [copied, setCopied] = useState(false);
  const [subject, setSubject] = useState(call.follow_up_email?.subject ?? "");
  const [body, setBody] = useState(call.follow_up_email?.body ?? "");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  // Message exact renvoyé par la route. Sans lui, « Erreur lors de l'envoi »
  // couvrait indifféremment un contact sans adresse, un refus de l'API Gmail
  // et une panne base — trois causes qui ne se corrigent pas pareil.
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(call.follow_up_sent_at ?? null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Destinataire de l'email de suivi. Sert aux deux chemins : la génération à
  // la demande quand l'ingestion a sauté l'email, ET l'envoi quand le call n'a
  // pas de contact — un rendez-vous dont l'invitation ne portait aucun
  // participant externe n'en a pas, et c'était sans issue.
  const [followUpRecipient, setFollowUpRecipient] = useState(call.contact_email ?? "");
  const [followUpStatus, setFollowUpStatus] = useState<"idle" | "loading">("idle");
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // « Envoyer » reste inerte tant qu'on ne sait pas à qui écrire : soit le
  // call porte déjà un contact, soit l'adresse saisie est plausible. Un bouton
  // actif qui répond « adresse introuvable » est plus coûteux qu'un bouton
  // grisé qui dit pourquoi.
  const recipientIsUsable = !!call.contact_email || isValidEmail(followUpRecipient);

  async function generateFollowUp() {
    setFollowUpStatus("loading");
    setFollowUpError(null);
    try {
      const res = await fetch(`/api/feedback/${call.id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactEmail: followUpRecipient.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "La génération a échoué.");
      const followUp = (data as { followUp: { subject: string; body: string } }).followUp;
      // Alimente directement les champs éditables : l'utilisateur enchaîne sur
      // la relecture et l'envoi sans recharger la page.
      setSubject(followUp.subject);
      setBody(followUp.body);
    } catch (err) {
      setFollowUpError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setFollowUpStatus("idle");
    }
  }

  // Speaker rename overrides, lifted here from TranscriptSection — both it
  // and SpeakerTimelineBlock need the same renamed display names.
  const [overrideMap, setOverrideMap] = useState(call.speaker_names_override);
  const allTurns = resolveTurns(call).map((t) =>
    t.speakerId && overrideMap[t.speakerId] ? { ...t, displayName: overrideMap[t.speakerId] } : t
  );
  const totalDurationMs = allTurns.reduce((max, t) => Math.max(max, t.endMs ?? 0), 0);

  // Video ref + seek plumbing — a click on a transcript row or a
  // SpeakerTimelineBlock mark calls seekTo(ms). If the video hasn't been
  // loaded yet (still behind the "Voir l'enregistrement" click-to-load
  // gate), the seek is queued and applied once the fetched URL is ready.
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pendingSeekMs, setPendingSeekMs] = useState<number | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);
  const hasVideo = !!(call.recall_bot_id && call.recording_id);

  async function loadVideo() {
    if (videoStatus !== "idle") return;
    setVideoStatus("loading");
    try {
      const res = await fetch(`/api/recall/video-url?callId=${call.id}`);
      if (!res.ok) {
        setVideoStatus("unavailable");
        return;
      }
      const { videoUrl: url } = (await res.json()) as { videoUrl: string };
      setVideoUrl(url);
      setVideoStatus("ready");
    } catch {
      setVideoStatus("unavailable");
    }
  }

  function seekTo(ms: number) {
    if (!hasVideo) return;
    if (videoStatus === "ready" && videoRef.current) {
      videoRef.current.currentTime = ms / 1000;
      videoRef.current.play().catch(() => {});
      setCurrentTimeMs(ms);
      return;
    }
    setPendingSeekMs(ms);
    loadVideo();
  }

  useEffect(() => {
    if (videoStatus === "ready" && pendingSeekMs !== null && videoRef.current) {
      videoRef.current.currentTime = pendingSeekMs / 1000;
      videoRef.current.play().catch(() => {});
      setCurrentTimeMs(pendingSeekMs);
      setPendingSeekMs(null);
    }
  }, [videoStatus, pendingSeekMs]);


  const a = call.analysis;
  const globalScore = a?.scores?.global_score ?? null;
  const effectiveScores = a
    ? getEffectiveScoresForDisplay({ scores: a.scores, playbook_snapshot: a.playbook_snapshot })
    : [];
  const displayName = formatContactDisplayName(call.company_name, call.contact_email);

  // Partagé entre la vue analysée et la vue « aucune parole » : sur un call
  // non analysé, l'enregistrement reste le seul moyen de vérifier ce qui
  // s'est passé (micro coupé, personne n'a parlé).
  const recordingPanel = hasVideo ? (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={LABEL}>Enregistrement</h2>
        {videoStatus === "idle" && (
          <button
            onClick={loadVideo}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-3 text-[12.5px] font-medium text-[color:var(--violet)] transition-colors hover:bg-[color:var(--lavender-strong)]"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Voir l&apos;enregistrement
          </button>
        )}
        {videoStatus === "loading" && (
          <span className="text-[12px] text-slate-400">Chargement…</span>
        )}
      </div>
      {videoStatus === "ready" && videoUrl && (
        <div className="mt-3 overflow-hidden rounded-2xl bg-slate-900 p-1.5">
          <video
            ref={videoRef}
            controls
            src={videoUrl}
            onTimeUpdate={(e) => setCurrentTimeMs(Math.floor(e.currentTarget.currentTime * 1000))}
            className="w-full rounded-xl bg-black"
            style={{ maxHeight: "320px" }}
          />
        </div>
      )}
      {videoStatus === "unavailable" && (
        <p className="mt-3 text-[13.5px] text-slate-400">Enregistrement non disponible.</p>
      )}
    </div>
  ) : (
    readOnly && <ReadOnlyVideoStatus call={call} />
  );

  // Bandeau de la page analysée : l'enregistrement en grand (même
  // chargement à la demande que recordingPanel), la frise des interventions
  // dessous. Sans vidéo ni frise, la colonne de gauche disparaît.
  const timelineTurns = allTurns
    .filter((t) => t.speakerId !== null && t.startMs !== null && t.endMs !== null)
    .map((t) => ({ speakerId: t.speakerId as string, displayName: t.displayName, startMs: t.startMs as number, endMs: t.endMs as number }));
  const bandVideo = hasVideo ? (
    videoStatus === "ready" && videoUrl ? (
      <video
        ref={videoRef}
        controls
        src={videoUrl}
        onTimeUpdate={(e) => setCurrentTimeMs(Math.floor(e.currentTarget.currentTime * 1000))}
        className="aspect-video w-full rounded-2xl bg-black"
      />
    ) : (
      <button
        type="button"
        onClick={loadVideo}
        disabled={videoStatus !== "idle"}
        className="grid aspect-video w-full place-items-center rounded-2xl bg-black/40 ring-1 ring-white/10 transition-colors hover:bg-black/30 disabled:cursor-default"
      >
        <span className="flex flex-col items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-slate-900">
            <svg className="h-6 w-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-[13px] font-medium text-white/80">
            {videoStatus === "loading"
              ? "Chargement…"
              : videoStatus === "unavailable"
              ? "Enregistrement non disponible."
              : "Voir l'enregistrement"}
          </span>
        </span>
      </button>
    )
  ) : readOnly ? (
    <div className="grid aspect-video w-full place-items-center rounded-2xl bg-black/30 px-6 text-center text-[13.5px] text-white/60 ring-1 ring-white/10">
      {readOnlyVideoMessage(call)}
    </div>
  ) : null;
  const hasBandLeft = bandVideo !== null || timelineTurns.length > 0;

  const sentimentDark: Record<string, string> = {
    positif: "bg-emerald-400/15 text-emerald-300",
    neutre: "bg-white/10 text-white/70",
    négatif: "bg-rose-400/15 text-rose-300",
  };
  // Mêmes seuils que les scores de la page (4 et 2,5), en teintes claires
  // pour le fond sombre.
  const darkBar = (v: number) => (v >= 4 ? "bg-emerald-400" : v >= 2.5 ? "bg-amber-400" : "bg-rose-400");

  // Transcript vide : le webhook n'analyse plus un call sans parole
  // (countSpokenWords, lib/recall.ts). Le dire, plutôt que « Analyse non
  // disponible », qui laisse croire à une panne.
  const noSpeech = !a && allTurns.length === 0;

  // « Email de suivi » n'existe que si le module est ouvert (parcours client,
  // lib/modules.ts). L'email est rédigé en arrière-plan quoi qu'il arrive : à
  // l'ouverture du module, chaque call a déjà le sien.
  const followUpEnabled = isModuleEnabled("follow_up");
  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    ...(followUpEnabled ? [{ key: "email" as const, label: "Email de suivi" }] : []),
    // Le transcript a son onglet (demande de Jean, 13/10/2026) : dans la
    // colonne de droite, il allongeait la page sans être lu à chaque fois.
    // La vidéo reste dans le bandeau : un clic sur une ligne y saute toujours.
    { key: "transcript" as const, label: "Transcript" },
    ...(dealMemory ? [{ key: "deal" as const, label: "Fiche deal" }] : []),
  ];
  const activeTab: Tab = (tab === "email" && !followUpEnabled) || (tab === "deal" && !dealMemory) ? "overview" : tab;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        {/* Back */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors mb-5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {backLabel}
        </Link>

        {/* En-tête : étape, date, durée, participants, puis le titre. La
            note et le résumé de l'évaluation sont dans le bandeau sombre. */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-slate-500">
            {call.meeting_stage && (
              <span
                title={call.meeting_title ?? undefined}
                className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2.5 py-0.5 text-[12px] font-semibold text-[color:var(--violet)]"
              >
                {MEETING_STAGE_LABELS[call.meeting_stage]}
              </span>
            )}
            <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
            {call.duration_seconds !== null && (
              <span className="flex items-center gap-1 tabular-nums">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                {formatDuration(call.duration_seconds)}
              </span>
            )}
            {call.participant_count !== null && (
              <span>{call.participant_count} {call.participant_count === 1 ? "participant" : "participants"}</span>
            )}
          </div>
          <h1 className="mt-3 break-words text-[28px] font-semibold leading-tight tracking-[-0.035em] text-slate-900 sm:text-[30px]">{displayName}</h1>
          {call.contact_email && call.contact_email !== displayName && (
            <p className="mt-1 break-all text-[13.5px] text-slate-500">{call.contact_email}</p>
          )}
        </header>

        {noSpeech ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
            <div className={`${CARD} p-6 sm:p-8`}>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Aucune parole détectée</h2>
              <p className="text-[14px] leading-relaxed text-slate-500 mt-2">
                L&apos;enregistrement ne contient aucune parole exploitable : ce rendez-vous n&apos;a donc été ni analysé,
                ni noté{followUpEnabled ? ", et aucun email de suivi n'a été rédigé" : ""}. Il ne compte pas dans vos
                moyennes.
              </p>
              <p className="text-[14px] leading-relaxed text-slate-500 mt-2">
                Le plus souvent, le micro était coupé ou personne n&apos;a pris la parole. Vous pouvez le vérifier en
                écoutant l&apos;enregistrement.
              </p>
            </div>
            <div>{recordingPanel}</div>
          </div>
        ) : !a ? (
          <div className={`${CARD} p-10 text-center text-slate-500 text-[14px]`}>
            Analyse non disponible pour cet appel.
          </div>
        ) : (
          <>
            {/* Le bandeau (maquette P3c, choisie par Jean le 13/10/2026) :
                l'enregistrement et qui a parlé à gauche ; la note, les scores
                par dimension et les prochaines étapes à droite. L'essentiel
                du call se lit sans faire défiler. */}
            <section className="overflow-hidden rounded-[28px] bg-slate-900 text-white">
              <div className={`grid grid-cols-1 ${hasBandLeft ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}>
                {hasBandLeft && (
                  <div className="p-4 sm:p-5">
                    {bandVideo}
                    {timelineTurns.length > 0 && (
                      <div className={`px-1 ${bandVideo ? "pt-5" : "pt-1"}`}>
                        <SpeakerTimelineBlock
                          tone="dark"
                          turns={timelineTurns}
                          totalDurationMs={totalDurationMs}
                          onSeek={seekTo}
                          seekable={hasVideo}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className={`flex flex-col gap-6 px-6 py-6 sm:px-8 ${hasBandLeft ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}>
                  {(globalScore !== null || a.sentiment) && (
                    <div className="flex flex-wrap items-baseline gap-3">
                      {globalScore !== null && (
                        <span className="text-[48px] font-semibold leading-none tracking-[-0.045em] tabular-nums">
                          {globalScore.toFixed(1)}<span className="text-[18px] font-medium text-white/45">/5</span>
                        </span>
                      )}
                      {a.sentiment && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${sentimentDark[a.sentiment] ?? "bg-white/10 text-white/70"}`}>
                          {a.sentiment}
                        </span>
                      )}
                    </div>
                  )}
                  {effectiveScores.length > 0 && (
                    <div className="space-y-2.5">
                      {effectiveScores.map((dim) => (
                        <div key={dim.key} className="grid grid-cols-[minmax(0,1fr)_90px_32px] items-center gap-3 text-[13px]">
                          <span className="truncate text-white/80">{dim.label}</span>
                          <div className="h-1.5 rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${darkBar(dim.score)}`} style={{ width: `${(dim.score / 5) * 100}%` }} />
                          </div>
                          <span className="text-right font-semibold tabular-nums">{dim.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(a.next_steps ?? []).length > 0 && (
                    <div className="rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10">
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Prochaines étapes</h2>
                      <ul className="mt-3 space-y-2">
                        {(a.next_steps ?? []).map((step, i) => (
                          <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-white">
                            <span className="w-3.5 shrink-0 text-center font-semibold text-[oklch(0.75_0.12_265)]">→</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {TABS.length > 1 && (
              <div className="mt-8 inline-flex items-center rounded-full bg-slate-100 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
                      activeTab === t.key
                        ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "overview" && (
              <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                {/* Gauche : ce qu'il faut retenir du call */}
                <div className="min-w-0 space-y-9">
                  {/* Points clés — generated on demand (not by analyzeCall), cached
                      on call_analysis.key_points. */}
                  <KeyPointsBlock callId={call.id} initialKeyPoints={a.key_points} bare />

                  <ConversationAnalyticsBlock analytics={analytics} />

                  <div className="grid grid-cols-1 gap-6 border-t border-border pt-8 sm:grid-cols-2">
                    <section>
                      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Points forts</h2>
                      <List items={a.strengths ?? []} icon="✓" color="text-[color:var(--success)]" />
                    </section>
                    <section>
                      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">Axes d&apos;amélioration</h2>
                      <List items={a.weaknesses ?? []} icon="△" color="text-[color:var(--warning)]" />
                    </section>
                  </div>

                  {/* Objections — module du parcours (semaine 5) : fermé, la
                      section n'existe pas. Les objections restent extraites et
                      apparaissent sur les calls passés le jour où il s'ouvre. */}
                  {isModuleEnabled("objections") && (a.objections ?? []).length > 0 && (
                    <section className="border-t border-border pt-8">
                      <h2 className={`${LABEL} mb-3`}>Objections rencontrées</h2>
                      <ul className="space-y-2.5">
                        {(a.objections ?? []).map((o, i) => (
                          <ObjectionItem
                            key={i}
                            objection={o.objection}
                            response={o.response}
                            trainingEnabled={isModuleEnabled("training")}
                          />
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                {/* Droite : le détail des scores, l'email */}
                <div className="min-w-0 space-y-8">
                  {/* Scores par dimension — dynamique via le playbook_snapshot de
                      l'analyse (ou les 4 labels historiques si absent) */}
                  {effectiveScores.length > 0 && (
                    <section>
                      <h2 className={`${LABEL} mb-4`}>Scores par dimension</h2>
                      <div className="space-y-4">
                        {effectiveScores.map((dim) => (
                          <ScoreBar
                            key={dim.key}
                            score={dim.score}
                            label={dim.label}
                            description={dim.description}
                            weight={dim.weight}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {followUpEnabled && (
                    <section className={`${CARD} p-5`}>
                      <h2 className={`${LABEL} mb-2.5`}>Email de suivi</h2>
                      {call.follow_up_email ? (
                        <>
                          <p className="text-[14px] font-semibold text-slate-900">{call.follow_up_email.subject}</p>
                          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-slate-600">{call.follow_up_email.body}</p>
                        </>
                      ) : (
                        <p className="text-[13.5px] text-slate-400">Aucun email de suivi généré.</p>
                      )}
                      <button
                        onClick={() => setTab("email")}
                        className="mt-4 inline-flex h-9 items-center rounded-full bg-[color:var(--primary)] px-4 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110"
                      >
                        Relire et envoyer
                      </button>
                    </section>
                  )}

                </div>
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="mt-8 max-w-3xl">
                <TranscriptSection
                  callId={call.id}
                  turns={allTurns}
                  overrideMap={overrideMap}
                  onOverrideMapChange={setOverrideMap}
                  onSeek={seekTo}
                  seekable={hasVideo}
                  currentTimeMs={videoStatus === "ready" ? currentTimeMs : null}
                />
              </div>
            )}

            {activeTab === "deal" && dealMemory && <DealMemoryBlock callId={call.id} panel={dealMemory} />}

            {activeTab === "email" && (
              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                {readOnly ? (
                  <ReadOnlyEmailBlock call={call} />
                ) : call.follow_up_email ? (
                  // Le rédacteur, présenté comme un email : destinataire et
                  // objet en lignes d'en-tête, le corps en grand, les actions
                  // en pied. Le menu « Type de call » a été retiré le
                  // 29/09/2026 : il ne changeait rien à l'email (les modèles
                  // par type de call ne servaient qu'aux tâches). Décision de
                  // Jean : pas de modèles par type de call pour l'email de suivi.
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50 px-5 py-3 sm:px-6">
                      <h2 className={LABEL}>Email de suivi suggéré</h2>
                      {sentAt ? (
                        <span className="rounded-full bg-[color:var(--success-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-emerald-700">
                          Envoyé le {formatSentAt(sentAt)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[color:var(--warning-soft)] px-2.5 py-0.5 text-[12px] font-semibold text-amber-700">Brouillon</span>
                      )}
                    </div>

                    <div className="divide-y divide-border border-b border-border">
                      <div className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                        <span className="w-14 shrink-0 text-[13px] text-slate-400">À</span>
                        {call.contact_email ? (
                          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-[13.5px] text-slate-800">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--lavender)] text-[10.5px] font-semibold text-[color:var(--violet)]">
                              {call.contact_email[0].toUpperCase()}
                            </span>
                            <span className="truncate">{call.contact_email}</span>
                          </span>
                        ) : sentAt ? (
                          <span className="text-[14px] text-slate-800">{followUpRecipient}</span>
                        ) : (
                          // Le call n'a pas de contact : l'invitation d'agenda ne
                          // portait aucun participant externe. L'email est bien
                          // rédigé, mais il n'a personne à qui aller — sans ce
                          // champ, « Envoyer » échouait sur « Adresse email du
                          // contact introuvable » sans aucun moyen d'y remédier.
                          <input
                            id="follow-up-recipient"
                            type="email"
                            value={followUpRecipient}
                            onChange={(e) => setFollowUpRecipient(e.target.value)}
                            placeholder="prenom.nom@entreprise.com"
                            aria-label="Destinataire"
                            className="min-w-0 flex-1 bg-transparent py-1 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
                        <span className="w-14 shrink-0 text-[13px] text-slate-400">Objet</span>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          readOnly={!!sentAt}
                          className="min-w-0 flex-1 bg-transparent py-1 text-[14.5px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none"
                          placeholder="Objet"
                        />
                      </div>
                    </div>
                    {!call.contact_email && !sentAt && (
                      <p className="border-b border-border bg-[color:var(--warning-soft)]/60 px-5 py-2 text-[12.5px] text-amber-800 sm:px-6">
                        Aucun participant externe n&apos;était identifié dans l&apos;invitation : indique l&apos;adresse à laquelle envoyer.
                      </p>
                    )}

                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      readOnly={!!sentAt}
                      rows={14}
                      className="block min-h-[340px] w-full resize-y bg-white px-5 py-4 text-[15px] leading-[1.7] text-slate-800 outline-none sm:px-6"
                    />

                    {sendStatus === "auth-error" && (
                      <div className="border-t border-border bg-[color:var(--warning-soft)] px-5 py-3 text-[13.5px] text-amber-700 sm:px-6">
                        Reconnecte-toi à Google pour envoyer cet email.{" "}
                        <a href="/api/auth/signout" className="font-medium underline hover:text-amber-900">
                          Se déconnecter
                        </a>
                      </div>
                    )}
                    {sendStatus === "error" && (
                      <p className="border-t border-border bg-[color:var(--danger-soft)] px-5 py-3 text-[13.5px] text-rose-700 sm:px-6">
                        {sendError ?? "Erreur lors de l’envoi, réessaie."}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-slate-50 px-5 py-3 sm:px-6">
                      <span className="text-[12.5px] tabular-nums text-slate-400">
                        {body.trim() ? body.trim().split(/\s+/).length : 0} mots
                      </span>
                      {!sentAt && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const text = `Objet : ${subject}\n\n${body}`;
                              navigator.clipboard.writeText(text).then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              });
                            }}
                            className="h-9 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            {copied ? "Copié !" : "Copier"}
                          </button>
                          <button
                            disabled={sendStatus === "sending" || !recipientIsUsable}
                            title={recipientIsUsable ? undefined : "Indique l'adresse du destinataire"}
                            onClick={async () => {
                              const to = call.contact_email ?? followUpRecipient.trim();
                              if (!window.confirm(`Envoyer cet email à ${to} ?`)) return;
                              setSendStatus("sending");
                              setSendError(null);
                              try {
                                const res = await fetch("/api/feedback/send-follow-up", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    callId: call.id,
                                    subject,
                                    body,
                                    // Envoyé seulement quand le call n'a pas de
                                    // contact : le serveur fait primer l'adresse
                                    // reçue, on ne veut pas écraser par mégarde
                                    // celle qui vient de l'invitation.
                                    ...(call.contact_email ? {} : { contactEmail: followUpRecipient.trim() }),
                                  }),
                                });
                                if (res.status === 401 || res.status === 403) {
                                  setSendStatus("auth-error");
                                  return;
                                }
                                if (!res.ok) {
                                  const detail = await res
                                    .json()
                                    .then((d: { error?: string }) => d.error ?? null)
                                    .catch(() => null);
                                  setSendError(detail);
                                  setSendStatus("error");
                                  return;
                                }
                                const now = new Date().toISOString();
                                setSentAt(now);
                                setSendStatus("sent");
                              } catch {
                                setSendStatus("error");
                              }
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--primary)] px-4 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.27 3.13a59.77 59.77 0 0118.22 8.87 59.77 59.77 0 01-18.22 8.88L6 12zm0 0h7.5" />
                            </svg>
                            {sendStatus === "sending" ? "Envoi…" : "Envoyer"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Affichait « en cours de génération… » alors que RIEN ne
                  // tournait : à l'ingestion, l'email est sauté quand le call
                  // n'a pas d'email de contact (invitation d'agenda sans
                  // participant externe). Le message était donc faux, et il
                  // n'existait aucun moyen de rattraper.
                  <div className={`${CARD} px-6 py-10 text-center sm:px-10`}>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </span>
                    <p className="mx-auto mt-4 max-w-[46ch] text-[14.5px] leading-relaxed text-slate-600">
                      Aucun email de suivi n&apos;a été généré pour ce call
                      {call.contact_email ? "." : " : aucun participant externe n'était identifié dans l'invitation, donc aucun destinataire."}
                    </p>
                    <div className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
                      <input
                        value={followUpRecipient}
                        onChange={(e) => setFollowUpRecipient(e.target.value)}
                        type="email"
                        placeholder="Email du destinataire"
                        className="h-10 flex-1 rounded-full border border-border bg-white px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
                      />
                      <button
                        onClick={generateFollowUp}
                        disabled={followUpStatus === "loading" || !followUpRecipient.trim()}
                        className="h-10 shrink-0 rounded-full bg-[color:var(--primary)] px-5 text-[13.5px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {followUpStatus === "loading" ? "Génération…" : "Générer l'email"}
                      </button>
                    </div>
                    {followUpError && <p className="mt-3 text-[13.5px] text-rose-700">{followUpError}</p>}
                  </div>
                )}

                {/* À côté, de quoi relire l'email : les prochaines étapes
                    convenues pendant le call. */}
                {(a.next_steps ?? []).length > 0 && (
                  <aside className="space-y-3 lg:pt-1">
                    <h3 className={LABEL}>Prochaines étapes</h3>
                    <ul className="space-y-2.5 rounded-2xl bg-[color:var(--lavender)] p-5">
                      {(a.next_steps ?? []).map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-800">
                          <span className="w-3.5 shrink-0 text-center font-semibold text-[color:var(--violet)]">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
