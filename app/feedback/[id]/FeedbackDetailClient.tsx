"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Settings, Search, Pencil } from "lucide-react";
import type { CallWithAnalysis, EmailTemplate } from "@/lib/db";
import type { ConversationAnalytics } from "@/lib/transcript-analytics";
import { getEffectiveScoresForDisplay } from "@/lib/playbook-scores";
import { formatContactDisplayName } from "@/lib/format";
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <p className="flex items-center justify-between gap-2 text-xs text-indigo-600 bg-indigo-50 rounded-md px-2.5 py-1.5 mb-3">
                  <span>Cliquez sur un nom pour le corriger, ou sur une ligne pour aller à ce moment de la vidéo</span>
                  <button onClick={dismissTip} className="text-indigo-400 hover:text-indigo-600 shrink-0">
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
                        isActive ? "bg-indigo-50 ring-1 ring-indigo-200" : i % 2 === 0 ? "bg-slate-50" : "bg-white"
                      } ${canSeek ? "cursor-pointer hover:bg-indigo-50/60" : ""}`}
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
                              className="text-xs font-semibold text-slate-700 uppercase tracking-wide border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

type SendStatus = "idle" | "sending" | "sent" | "error" | "auth-error";
type VideoStatus = "idle" | "loading" | "ready" | "unavailable";
type ReplyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "replied"; repliedAt: string; body: string | null; open: boolean; loadingBody: boolean }
  | { status: "none" };

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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enregistrement</h2>
      <p className="text-sm text-slate-500 italic">{message}</p>
    </div>
  );
}

function ReadOnlyEmailBlock({ call }: { call: CallWithAnalysis }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
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
  const [sentAt, setSentAt] = useState<string | null>(call.follow_up_sent_at ?? null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [reply, setReply] = useState<ReplyState>({ status: "idle" });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [replySuggestion, setReplySuggestion] = useState<string | null>(null);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [showPromptSettings, setShowPromptSettings] = useState(false);

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

  useEffect(() => {
    if (readOnly) return;
    if (!call.follow_up_sent_at) return;
    setReply({ status: "loading" });
    fetch(`/api/feedback/check-reply?callId=${call.id}`)
      .then((r) => r.json())
      .then((data: { replied: boolean; repliedAt?: string; body?: string | null }) => {
        if (data.replied && data.repliedAt) {
          setReply({ status: "replied", repliedAt: data.repliedAt, body: data.body ?? null, open: false, loadingBody: false });
        } else {
          setReply({ status: "none" });
        }
      })
      .catch(() => setReply({ status: "none" }));
  }, [call.id, call.follow_up_sent_at, readOnly]);

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

  // Selecting a template does NOT auto-regenerate — only this explicit
  // action does (so it never silently overwrites a reply the user is mid-edit
  // on). Only meaningful once the prospect has actually replied — same
  // precondition the API route itself enforces.
  async function handleGenerateSuggestion() {
    setGeneratingSuggestion(true);
    setSuggestionError(null);
    try {
      const res = await fetch("/api/feedback/generate-reply-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.id,
          ...(selectedTemplateId && selectedTemplateId !== DEFAULT_PROMPT_VALUE
            ? { email_template_id: selectedTemplateId }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "La génération a échoué.");
      }
      setReplySuggestion((data as { suggestion?: string }).suggestion ?? null);
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setGeneratingSuggestion(false);
    }
  }

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
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {backLabel}
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
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
                      tab === t.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
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
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
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
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Points forts</h2>
                      <List items={a.strengths ?? []} icon="✓" color="text-green-500" />
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Axes d&apos;amélioration</h2>
                      <List items={a.weaknesses ?? []} icon="△" color="text-orange-400" />
                    </div>
                  </div>

                  {/* Objections */}
                  {(a.objections ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Objections rencontrées</h2>
                      <List items={a.objections ?? []} icon="–" color="text-slate-400" />
                    </div>
                  )}

                  {/* Next steps */}
                  {(a.next_steps ?? []).length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Prochaines étapes</h2>
                      <List items={a.next_steps ?? []} icon="→" color="text-indigo-400" />
                    </div>
                  )}
                </div>
              )}

              {tab === "email" && (
                readOnly ? (
                  <ReadOnlyEmailBlock call={call} />
                ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <label htmlFor="feedback-email-template" className="text-xs text-slate-400 shrink-0">
                      Type de call
                    </label>
                    <select
                      id="feedback-email-template"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px]"
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
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                        >
                          {copied ? "Copié !" : "Copier"}
                        </button>
                        <button
                          disabled={sendStatus === "sending"}
                          onClick={async () => {
                            const to = call.contact_email ?? "ce contact";
                            if (!window.confirm(`Envoyer cet email à ${to} ?`)) return;
                            setSendStatus("sending");
                            try {
                              const res = await fetch("/api/feedback/send-follow-up", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ callId: call.id, subject, body }),
                              });
                              if (res.status === 401 || res.status === 403) {
                                setSendStatus("auth-error");
                                return;
                              }
                              if (!res.ok) {
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
                          className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors px-2.5 py-1 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {reply.status === "replied" && (
                          <button
                            onClick={() =>
                              setReply((r) =>
                                r.status === "replied" ? { ...r, open: !r.open } : r
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Le prospect a répondu
                            <svg
                              className={`w-3 h-3 shrink-0 transition-transform ${reply.open ? "rotate-180" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                        )}
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
                    <p className="mb-4 text-sm text-red-600">Erreur lors de l&apos;envoi, réessaie.</p>
                  )}

                  {reply.status === "replied" && reply.open && (
                    <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1.5">
                        Réponse du prospect — {formatSentAt(reply.repliedAt)}
                      </p>
                      {reply.body !== null ? (
                        <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                          {reply.body}
                        </pre>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="text-sm text-slate-500 italic">Contenu non chargé.</p>
                          <button
                            disabled={reply.loadingBody}
                            onClick={async () => {
                              setReply((r) => r.status === "replied" ? { ...r, loadingBody: true } : r);
                              try {
                                const res = await fetch(`/api/feedback/check-reply?callId=${call.id}&force=true`);
                                const data = await res.json() as { replied: boolean; repliedAt?: string; body?: string | null };
                                setReply((r) =>
                                  r.status === "replied"
                                    ? { ...r, body: data.body ?? null, loadingBody: false }
                                    : r
                                );
                              } catch {
                                setReply((r) => r.status === "replied" ? { ...r, loadingBody: false } : r);
                              }
                            }}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reply.loadingBody ? "Chargement…" : "Charger le contenu"}
                          </button>
                        </div>
                      )}

                      {reply.body !== null && (
                        <div className="mt-3 pt-3 border-t border-green-100">
                          <button
                            disabled={generatingSuggestion}
                            onClick={handleGenerateSuggestion}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingSuggestion ? "Génération…" : "✨ Régénérer avec Brief"}
                          </button>
                          {suggestionError && <p className="text-xs text-red-500 mt-2">{suggestionError}</p>}
                          {replySuggestion !== null && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Suggestion de réponse
                              </p>
                              <textarea
                                value={replySuggestion}
                                onChange={(e) => setReplySuggestion(e.target.value)}
                                rows={5}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {call.follow_up_email ? (
                    <>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                        placeholder="Objet"
                      />
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-3 border border-slate-200 rounded-lg text-sm text-slate-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                      />
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm italic">Email de suivi en cours de génération…</p>
                  )}
                </div>
                )
              )}
            </div>

            {/* RIGHT — sticky video + transcript, stays in view while the
                left column scrolls */}
            <div className="lg:sticky lg:top-6 space-y-5">
              {hasVideo ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enregistrement</h2>
                    {videoStatus === "idle" && (
                      <button
                        onClick={loadVideo}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
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
