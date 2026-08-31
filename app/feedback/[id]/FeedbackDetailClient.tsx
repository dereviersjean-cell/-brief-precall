"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Settings, Search, Pencil } from "lucide-react";
import type { CallWithAnalysis, EmailTemplate } from "@/lib/db";
import { MEETING_STAGE_LABELS } from "@/lib/meeting-stage";
import type { ConversationAnalytics } from "@/lib/transcript-analytics";
import { getEffectiveScoresForDisplay } from "@/lib/playbook-scores";
import { formatContactDisplayName } from "@/lib/format";
import { isValidEmail } from "@/lib/email-address";
import TemplatePromptSettingsModal from "@/app/components/TemplatePromptSettingsModal";
import ConversationAnalyticsBlock from "./ConversationAnalyticsBlock";
import KeyPointsBlock from "./KeyPointsBlock";
import SpeakerTimelineBlock from "./SpeakerTimelineBlock";

const DEFAULT_PROMPT_VALUE = "__default__";

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
      <span key={key++} className="bg-yellow-100 text-slate-900">
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

// Lives in the sticky right column next to the video now (was a standalone
// collapsible block) — turns/overrideMap are resolved once by the parent
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
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showTip, setShowTip] = useState(false);
  const activeRowRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">📄 Transcript</h2>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-4">
          {turns.length === 0 ? (
            <p className="text-sm text-slate-400">Transcript non disponible</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher dans le transcript…"
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                  />
                </div>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-xs font-medium text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors"
                >
                  {copied ? "✓ Copié" : "📋 Copier"}
                </button>
              </div>
              {showTip && hasTimestamps && (
                <p className="flex items-center justify-between gap-2 text-xs text-[color:var(--violet)] bg-[color:var(--lavender)] rounded-md px-2.5 py-1.5 mb-3">
                  <span>Cliquez sur un nom pour le corriger, ou sur une ligne pour aller à ce moment de la vidéo</span>
                  <button onClick={dismissTip} className="text-[color:var(--violet)] hover:text-[color:var(--violet)] shrink-0">
                    ✕
                  </button>
                </p>
              )}
              <p className="text-xs text-slate-400 mb-3">
                {trimmedQuery
                  ? `${filteredTurns.length} résultat${filteredTurns.length !== 1 ? "s" : ""} trouvé${filteredTurns.length !== 1 ? "s" : ""}`
                  : `${turns.length} tour${turns.length !== 1 ? "s" : ""} de parole`}
              </p>
              <div className="max-h-[420px] overflow-y-auto pr-1">
                {filteredTurns.map((turn, i) => {
                  const isActive = i === activeIndex;
                  const canSeek = seekable && turn.startMs !== null;
                  return (
                    <div
                      key={i}
                      ref={isActive ? activeRowRef : undefined}
                      onClick={canSeek ? () => onSeek(turn.startMs as number) : undefined}
                      className={`rounded-lg p-3 mb-2 transition-colors ${
                        isActive ? "bg-[color:var(--lavender)] ring-1 ring-[color:var(--lavender-strong)]" : i % 2 === 0 ? "bg-slate-50" : "bg-white"
                      } ${canSeek ? "cursor-pointer hover:bg-[color:var(--lavender)]/60" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                          {editingSpeakerId === turn.speakerId ? (
                            <input
                              autoFocus
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit();
                                if (e.key === "Escape") setEditingSpeakerId(null);
                              }}
                              onBlur={commitEdit}
                              className="text-xs font-semibold text-slate-700 uppercase tracking-wide border border-[color:var(--lavender-strong)] rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                            />
                          ) : (
                            <>
                              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide truncate">
                                {turn.displayName}
                              </span>
                              {turn.speakerId && (
                                <button
                                  onClick={() => startEditing(turn)}
                                  title="Corriger le nom du speaker"
                                  className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {turn.startMs !== null && (
                          <span className="text-xs text-slate-400 shrink-0">{formatDuration(Math.floor(turn.startMs / 1000))}</span>
                        )}
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{highlightMatches(turn.text, query)}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
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
    score >= 4 ? "bg-green-500" : score >= 2.5 ? "bg-orange-400" : "bg-red-400";
  const textColor =
    score >= 4 ? "text-green-700" : score >= 2.5 ? "text-orange-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label}
          {weight != null && weight !== 1 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              poids {weight}
            </span>
          )}
        </span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/5</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (items.length === 0) return <p className="text-slate-400 text-sm italic">Aucun élément.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`text-sm mt-0.5 ${color}`}>{icon}</span>
          <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        isWon ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
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
function ObjectionItem({ objection, response }: { objection: string; response: string }) {
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
    <li className="text-sm leading-relaxed">
      <p className="text-slate-700">
        <span className="text-slate-400">–</span> {objection}
      </p>
      <p className="text-slate-500 pl-4 mt-0.5">↳ {response}</p>
      <span className="pl-4 mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="text-xs text-[color:var(--violet)] hover:text-[color:var(--violet)] font-medium"
        >
          {expanded ? "Masquer les cas similaires" : "Voir des cas similaires déjà traités"}
        </button>
        <Link
          href={`/training?objection=${encodeURIComponent(objection)}`}
          className="text-xs text-[color:var(--violet)] font-medium hover:underline"
        >
          M&apos;entraîner sur cette objection →
        </Link>
      </span>
      {expanded && (
        <div className="pl-4 mt-2 space-y-2">
          {loading && <p className="text-xs text-slate-400 italic">Recherche en cours…</p>}
          {error && <p className="text-xs text-red-500">Recherche indisponible pour le moment.</p>}
          {similar && similar.length === 0 && !loading && !error && (
            <p className="text-xs text-slate-400 italic">Aucun cas similaire trouvé pour l&apos;instant.</p>
          )}
          {similar?.map((s) => (
            <div key={s.id} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-600 font-medium">{s.objection}</p>
                <OutcomeBadge outcome={s.outcome} />
              </div>
              <p className="text-xs text-slate-500 mt-1">↳ {s.response}</p>
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
function ReadOnlyVideoStatus({ call }: { call: CallWithAnalysis }) {
  const message = !call.recall_bot_id
    ? "Aucun bot n'a été programmé pour cet appel."
    : "L'enregistrement n'a pas pu être récupéré (bot refusé ou échec technique).";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enregistrement</h2>
      <p className="text-sm text-slate-500 italic">{message}</p>
    </div>
  );
}

function ReadOnlyEmailBlock({ call }: { call: CallWithAnalysis }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email de suivi</h2>
        {call.follow_up_sent_at && (
          <span className="text-xs text-emerald-600 font-medium">Envoyé le {formatSentAt(call.follow_up_sent_at)}</span>
        )}
      </div>
      {call.follow_up_email ? (
        <>
          <p className="text-sm font-semibold text-slate-800 mb-2">{call.follow_up_email.subject}</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{call.follow_up_email.body}</p>
        </>
      ) : (
        <p className="text-slate-400 text-sm italic">Aucun email de suivi généré.</p>
      )}
    </div>
  );
}

type Tab = "overview" | "email";

export default function FeedbackDetailClient({
  call,
  analytics,
  readOnly = false,
  backHref = "/feedback",
  backLabel = "Retour aux feedbacks",
}: {
  call: CallWithAnalysis;
  analytics: ConversationAnalytics | null;
  readOnly?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showPromptSettings, setShowPromptSettings] = useState(false);
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

  // Org email templates for the "Type de call" dropdown — an empty result is
  // expected (no manager has visited /team/email-templates yet) and just
  // leaves the dropdown on "Prompt par défaut", not an error.
  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    fetch("/api/email-templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: EmailTemplate[]) => {
        if (cancelled) return;
        setTemplates(data);
        setSelectedTemplateId(data.length > 0 ? data[0].id : DEFAULT_PROMPT_VALUE);
      })
      .catch(() => {
        if (!cancelled) setSelectedTemplateId(DEFAULT_PROMPT_VALUE);
      });
    return () => {
      cancelled = true;
    };
  }, [readOnly]);


  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const a = call.analysis;
  const globalScore = a?.scores?.global_score ?? null;
  const effectiveScores = a
    ? getEffectiveScoresForDisplay({ scores: a.scores, playbook_snapshot: a.playbook_snapshot })
    : [];
  const displayName = formatContactDisplayName(call.company_name, call.contact_email);

  const globalColor =
    globalScore === null
      ? "text-slate-400"
      : globalScore >= 4
      ? "text-green-600"
      : globalScore >= 2.5
      ? "text-orange-500"
      : "text-red-500";

  const sentimentBg: Record<string, string> = {
    positif: "bg-green-100 text-green-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-100 text-red-600",
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "email", label: "Email de suivi" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[color:var(--violet)] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {backLabel}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
                {call.meeting_stage && (
                  <span
                    title={call.meeting_title ?? undefined}
                    className="inline-flex items-center rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--violet)]"
                  >
                    {MEETING_STAGE_LABELS[call.meeting_stage]}
                  </span>
                )}
              </div>
              {call.contact_email && call.contact_email !== displayName && (
                <p className="text-slate-400 text-sm mt-0.5">{call.contact_email}</p>
              )}
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-3 flex-wrap">
                <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
                {call.duration_seconds !== null && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                    </svg>
                    {formatDuration(call.duration_seconds)}
                  </span>
                )}
                {call.participant_count !== null && (
                  <span>{call.participant_count} {call.participant_count === 1 ? "participant" : "participants"}</span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              {globalScore !== null && (
                <p className={`text-3xl font-bold ${globalColor}`}>
                  {globalScore.toFixed(1)}<span className="text-base font-medium text-slate-300">/5</span>
                </p>
              )}
              {a?.sentiment && (
                <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${sentimentBg[a.sentiment] ?? "bg-slate-100 text-slate-500"}`}>
                  {a.sentiment}
                </span>
              )}
            </div>
          </div>
        </div>

        {!a ? (
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-10 text-center text-slate-400 text-sm">
            Analyse non disponible pour cet appel.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
            {/* LEFT — tabbed content, scrolls with the page */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      tab === t.key ? "brand-gradient text-white" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="space-y-5">
                  {/* Points clés — generated on demand (not by analyzeCall), cached
                      on call_analysis.key_points. */}
                  <KeyPointsBlock callId={call.id} initialKeyPoints={a.key_points} />

                  {/* Qui a parlé, quand — clickable, seeks the video on the right. */}
                  <SpeakerTimelineBlock
                    turns={allTurns
                      .filter((t) => t.speakerId !== null && t.startMs !== null && t.endMs !== null)
                      .map((t) => ({ speakerId: t.speakerId as string, displayName: t.displayName, startMs: t.startMs as number, endMs: t.endMs as number }))}
                    totalDurationMs={totalDurationMs}
                    onSeek={seekTo}
                    seekable={hasVideo}
                  />

                  <ConversationAnalyticsBlock analytics={analytics} />

                  {/* Scores par dimension — dynamique via le playbook_snapshot de
                      l'analyse (ou les 4 labels historiques si absent) */}
                  {effectiveScores.length > 0 && (
                    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-6">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                        Scores par dimension
                      </h2>
                      <div className="space-y-5">
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
                    </div>
                  )}

                  {/* Strengths + Weaknesses */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Points forts</h2>
                      <List items={a.strengths ?? []} icon="✓" color="text-green-500" />
                    </div>
                    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Axes d&apos;amélioration</h2>
                      <List items={a.weaknesses ?? []} icon="△" color="text-orange-400" />
                    </div>
                  </div>

                  {/* Objections */}
                  {(a.objections ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Objections rencontrées</h2>
                      <ul className="space-y-3">
                        {(a.objections ?? []).map((o, i) => (
                          <ObjectionItem key={i} objection={o.objection} response={o.response} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next steps */}
                  {(a.next_steps ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Prochaines étapes</h2>
                      <List items={a.next_steps ?? []} icon="→" color="text-[color:var(--violet)]" />
                    </div>
                  )}
                </div>
              )}

              {tab === "email" && (
                readOnly ? (
                  <ReadOnlyEmailBlock call={call} />
                ) : (
                <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <label htmlFor="feedback-email-template" className="text-xs text-slate-400 shrink-0">
                      Type de call
                    </label>
                    <select
                      id="feedback-email-template"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] max-w-[220px]"
                    >
                      {selectedTemplateId === "" && (
                        <option value="" disabled hidden>
                          Sélectionner un type
                        </option>
                      )}
                      <option value={DEFAULT_PROMPT_VALUE}>Prompt par défaut</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {selectedTemplate && (
                      <button
                        onClick={() => setShowPromptSettings(true)}
                        title="Personnaliser le prompt pour vos futures générations"
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email de suivi suggéré</h2>
                    {call.follow_up_email && !sentAt && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const text = `Objet : ${subject}\n\n${body}`;
                            navigator.clipboard.writeText(text).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                          }}
                          className="text-xs font-medium text-[color:var(--violet)] hover:brightness-90 transition-colors px-2.5 py-1 rounded-lg border border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)]"
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
                          className="text-xs font-medium text-white brand-gradient hover:brightness-110 transition-colors px-2.5 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendStatus === "sending" ? "Envoi…" : "Envoyer"}
                        </button>
                      </div>
                    )}
                    {sentAt && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-emerald-600 font-medium">
                          Envoyé le {formatSentAt(sentAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {sendStatus === "auth-error" && (
                    <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                      Reconnecte-toi à Google pour envoyer cet email.{" "}
                      <a href="/api/auth/signout" className="font-medium underline hover:text-amber-900">
                        Se déconnecter
                      </a>
                    </div>
                  )}
                  {sendStatus === "error" && (
                    <p className="mb-4 text-sm text-red-600">
                      {sendError ?? "Erreur lors de l’envoi, réessaie."}
                    </p>
                  )}

                  {call.follow_up_email ? (
                    <>
                      {!call.contact_email && !sentAt && (
                        // Le call n'a pas de contact : l'invitation d'agenda ne
                        // portait aucun participant externe. L'email est bien
                        // rédigé, mais il n'a personne à qui aller — sans ce
                        // champ, « Envoyer » échouait sur « Adresse email du
                        // contact introuvable » sans aucun moyen d'y remédier.
                        <div className="mb-3">
                          <label htmlFor="follow-up-recipient" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Destinataire
                          </label>
                          <input
                            id="follow-up-recipient"
                            type="email"
                            value={followUpRecipient}
                            onChange={(e) => setFollowUpRecipient(e.target.value)}
                            placeholder="prenom.nom@entreprise.com"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                          />
                          <p className="mt-1.5 text-xs text-slate-500">
                            Aucun participant externe n&apos;était identifié dans l&apos;invitation : indique l&apos;adresse à laquelle envoyer.
                          </p>
                        </div>
                      )}
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] mb-3"
                        placeholder="Objet"
                      />
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none leading-relaxed"
                      />
                    </>
                  ) : (
                    // Affichait « en cours de génération… » alors que RIEN ne
                    // tournait : à l'ingestion, l'email est sauté quand le call
                    // n'a pas d'email de contact (invitation d'agenda sans
                    // participant externe). Le message était donc faux, et il
                    // n'existait aucun moyen de rattraper.
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Aucun email de suivi n&apos;a été généré pour ce call
                        {call.contact_email ? "." : " : aucun participant externe n'était identifié dans l'invitation, donc aucun destinataire."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={followUpRecipient}
                          onChange={(e) => setFollowUpRecipient(e.target.value)}
                          type="email"
                          placeholder="Email du destinataire"
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
                        />
                        <button
                          onClick={generateFollowUp}
                          disabled={followUpStatus === "loading" || !followUpRecipient.trim()}
                          className="h-9 px-3.5 inline-flex items-center justify-center rounded-lg brand-gradient text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {followUpStatus === "loading" ? "Génération…" : "Générer l'email"}
                        </button>
                      </div>
                      {followUpError && <p className="text-sm text-red-600">{followUpError}</p>}
                    </div>
                  )}
                </div>
                )
              )}
            </div>

            {/* RIGHT — sticky video + transcript, stays in view while the
                left column scrolls */}
            <div className="lg:sticky lg:top-6 space-y-5">
              {hasVideo ? (
                <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enregistrement</h2>
                    {videoStatus === "idle" && (
                      <button
                        onClick={loadVideo}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--violet)] hover:brightness-90 transition-colors px-2.5 py-1 rounded-lg border border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)]"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Voir l&apos;enregistrement
                      </button>
                    )}
                    {videoStatus === "loading" && (
                      <span className="text-xs text-slate-400">Chargement…</span>
                    )}
                  </div>
                  {videoStatus === "ready" && videoUrl && (
                    <video
                      ref={videoRef}
                      controls
                      src={videoUrl}
                      onTimeUpdate={(e) => setCurrentTimeMs(Math.floor(e.currentTarget.currentTime * 1000))}
                      className="w-full rounded-xl bg-black"
                      style={{ maxHeight: "320px" }}
                    />
                  )}
                  {videoStatus === "unavailable" && (
                    <p className="text-sm text-slate-400 italic">Enregistrement non disponible.</p>
                  )}
                </div>
              ) : (
                readOnly && <ReadOnlyVideoStatus call={call} />
              )}

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
          </div>
        )}
      </div>

      {showPromptSettings && selectedTemplate && (
        <TemplatePromptSettingsModal
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          defaultSystemPrompt={selectedTemplate.system_prompt}
          onClose={() => setShowPromptSettings(false)}
        />
      )}
    </div>
  );
}
