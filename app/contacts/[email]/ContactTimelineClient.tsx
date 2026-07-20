"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import type { ContactTimelineItem } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import FadeIn from "@/app/dashboard/FadeIn";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// "2h 15min" / "45 min" — only shown when at least one call has a recorded
// duration, so callers guard on totalSeconds > 0.
function formatTotalDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
      <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 4
      ? "bg-green-100 text-green-700"
      : score >= 2.5
      ? "bg-orange-100 text-orange-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score.toFixed(1)}/5
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const map: Record<string, string> = {
    positif: "bg-green-50 text-green-600",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-50 text-red-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[sentiment] ?? "bg-slate-100 text-slate-500"}`}>
      {sentiment}
    </span>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function ReplyEntry({ item }: { item: ContactTimelineItem }) {
  const [body, setBody] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  if (!item.replied_at) return null;

  const loadBody = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback/check-reply?callId=${item.id}&force=true`);
      const data = await res.json() as { replied: boolean; body?: string | null };
      setBody(data.body ?? "");
      setOpen(true);
    } catch {
      setBody("");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 ml-4 relative pl-8">
      {/* Sub-dot — blue */}
      <div className="absolute left-0 top-2.5 w-3 h-3 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-blue-400" />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700">Le prospect a répondu</p>
            <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(item.replied_at)}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!open && (
              <button
                disabled={loading}
                onClick={() => body !== null ? setOpen(true) : loadBody()}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Chargement…" : "Voir la réponse"}
              </button>
            )}
            {open && (
              <>
                <button
                  onClick={() => { setShowReplyForm((v) => !v); setSendStatus("idle"); }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100"
                >
                  Répondre
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-100"
                >
                  Refermer
                </button>
              </>
            )}
          </div>
        </div>

        {/* Success toast */}
        {successToast && (
          <div className="mx-4 mt-3 rounded-xl border px-4 py-2.5 flex items-center justify-between gap-4 bg-emerald-50 border-emerald-200">
            <p className="text-sm font-medium text-emerald-700">Email envoyé avec succès.</p>
            <button onClick={() => setSuccessToast(false)} className="text-emerald-400 hover:text-emerald-600 text-lg leading-none shrink-0">×</button>
          </div>
        )}

        {/* Inline reply form — shown before body content */}
        {open && showReplyForm && (
          <div className="px-4 pt-3 pb-3 border-t border-blue-100">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
              placeholder="Votre message de relance…"
              className="w-full px-3 py-2.5 border border-blue-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                disabled={sendStatus === "sending" || !replyText.trim()}
                onClick={async () => {
                  setSendStatus("sending");
                  try {
                    const res = await fetch("/api/feedback/send-reply", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ callId: item.id, body: replyText }),
                    });
                    if (!res.ok) {
                      setSendStatus("error");
                      return;
                    }
                    setSendStatus("sent");
                    setReplyText("");
                    setShowReplyForm(false);
                    setSendStatus("idle");
                    setSuccessToast(true);
                    setTimeout(() => setSuccessToast(false), 3000);
                  } catch {
                    setSendStatus("error");
                  }
                }}
                className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendStatus === "sending" ? "Envoi…" : "Envoyer"}
              </button>
              <button
                disabled={generatingAI}
                onClick={async () => {
                  setGeneratingAI(true);
                  try {
                    const res = await fetch("/api/feedback/generate-reply-suggestion", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ callId: item.id }),
                    });
                    const data = await res.json() as { suggestion?: string };
                    if (data.suggestion) setReplyText(data.suggestion);
                  } catch {
                    // silent
                  } finally {
                    setGeneratingAI(false);
                  }
                }}
                className="text-xs font-medium text-[color:var(--violet)] hover:brightness-90 transition-colors px-3 py-1.5 rounded-lg border border-[color:var(--lavender-strong)] hover:bg-[color:var(--lavender)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingAI ? "Génération…" : "Générer avec l'IA"}
              </button>
              <button
                onClick={() => { setShowReplyForm(false); setSendStatus("idle"); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5"
              >
                Annuler
              </button>
              {sendStatus === "error" && (
                <p className="text-xs text-red-500">Erreur lors de l&apos;envoi, réessaie.</p>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        {open && body !== null && (
          <div className={`px-4 pb-4 ${showReplyForm ? "" : "border-t border-blue-100"}`}>
            {body !== "" ? (
              <pre className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white rounded-lg px-3 py-3 border border-blue-100 font-sans">
                {body}
              </pre>
            ) : (
              <p className="mt-3 text-sm text-slate-400 italic">Contenu de la réponse non disponible.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpEntry({ item }: { item: ContactTimelineItem }) {
  const [open, setOpen] = useState(false);
  if (!item.follow_up_email) return null;

  return (
    <div className="mt-3 ml-4 relative pl-8">
      {/* Sub-dot */}
      <div className="absolute left-0 top-2.5 w-3 h-3 rounded-full bg-white border-2 border-emerald-400 flex items-center justify-center">
        <div className="w-1 h-1 rounded-full bg-emerald-400" />
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl overflow-hidden">
        {/* Header row — always visible, clickable */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
        >
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
            <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">
              {item.follow_up_email.subject}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {item.follow_up_sent_at
                ? `Envoyé le ${formatDate(item.follow_up_sent_at)}`
                : "Brouillon généré"}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Expandable body */}
        {open && (
          <div className="px-4 pb-4 border-t border-emerald-100">
            <pre className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-white rounded-lg px-3 py-3 border border-emerald-100 font-sans">
              {item.follow_up_email.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

type Props = {
  contactEmail: string;
  timeline: ContactTimelineItem[];
};

export default function ContactTimelineClient({ contactEmail, timeline }: Props) {
  const displayName = formatContactDisplayName(timeline[0]?.company_name ?? null, contactEmail);
  const videoCallCount = timeline.length;
  const emailsSentCount = timeline.filter((i) => !!i.follow_up_sent_at).length;
  const repliesCount = timeline.filter((i) => !!i.replied_at).length;
  const replyRate = emailsSentCount > 0 ? Math.round((repliesCount / emailsSentCount) * 100) : null;
  const totalDurationSeconds = timeline.reduce((n, i) => n + (i.duration_seconds ?? 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[color:var(--violet)] transition-colors mb-6">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Tous les contacts
        </Link>

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-blue-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br brand-gradient flex items-center justify-center shrink-0 shadow-[var(--shadow-glow)]">
              <span className="text-lg font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
              {contactEmail !== displayName && <p className="text-slate-400 text-sm mt-0.5">{contactEmail}</p>}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {videoCallCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--lavender)] text-[color:var(--violet)]">
                    <VideoIcon className="w-3 h-3 shrink-0" />
                    {videoCallCount} {videoCallCount === 1 ? "visio enregistrée" : "visios enregistrées"}
                  </span>
                )}
                {emailsSentCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                    <EnvelopeIcon className="w-3 h-3 shrink-0" />
                    {emailsSentCount} {emailsSentCount === 1 ? "email envoyé" : "emails envoyés"}
                  </span>
                )}
                {repliesCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    <CheckIcon className="w-3 h-3 shrink-0" />
                    {repliesCount} {repliesCount === 1 ? "réponse" : "réponses"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {timeline.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
          <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-medium">Aucun call enregistré pour ce contact</p>
          <p className="text-slate-400 text-sm mt-1">L&apos;historique apparaîtra ici après un premier call.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
          {/* LEFT — vertical timeline */}
          <div className="min-w-0 relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />

            <div className="space-y-0">
              {timeline.map((item, idx) => {
                const score = item.analysis?.global_score ?? null;
                const isLast = idx === timeline.length - 1;

                return (
                  <div key={item.id} className={`relative pl-12 ${isLast ? "" : "pb-6"}`}>
                    {/* Dot */}
                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-white border-2 border-[color:var(--violet)] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[color:var(--violet)]" />
                    </div>

                    {/* Call card */}
                    <Link
                      href={`/feedback/${item.id}`}
                      className="block bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5 hover:shadow-[var(--shadow-md)] hover:border-[color:var(--lavender-strong)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                            <p className="font-semibold text-slate-900 text-sm">{formatDateTime(item.date)}</p>
                          </div>
                          <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                            {item.duration_seconds !== null && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                                </svg>
                                {formatDuration(item.duration_seconds)}
                              </span>
                            )}
                            {item.recall_bot_id && (
                              <svg className="w-4 h-4 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <SentimentBadge sentiment={item.analysis?.sentiment ?? null} />
                          {score !== null && <ScoreBadge score={score} />}
                        </div>
                      </div>

                      {item.analysis?.summary && (
                        <p className="text-slate-500 text-sm mt-3 leading-relaxed line-clamp-2">
                          {item.analysis.summary}
                        </p>
                      )}

                      {!item.analysis && (
                        <p className="text-slate-300 text-xs mt-3 italic">Analyse en attente…</p>
                      )}
                    </Link>

                    <FollowUpEntry item={item} />
                    <ReplyEntry item={item} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT — sticky summary */}
          <div className="lg:sticky lg:top-6">
            <FadeIn delay={0.15}>
              <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Résumé</h2>
                <div className="divide-y divide-slate-100">
                  {replyRate !== null && (
                    <SummaryRow icon={<TrendingUp className="w-4 h-4 text-slate-300" />} label="Taux de réponse" value={`${replyRate}%`} />
                  )}
                  {totalDurationSeconds > 0 && (
                    <SummaryRow icon={<Clock className="w-4 h-4 text-slate-300" />} label="Durée totale échangée" value={formatTotalDuration(totalDurationSeconds)} />
                  )}
                  <SummaryRow icon={<Calendar className="w-4 h-4 text-slate-300" />} label="Premier échange" value={formatDate(timeline[0].date)} />
                  <SummaryRow icon={<Calendar className="w-4 h-4 text-slate-300" />} label="Dernier échange" value={formatDate(timeline[timeline.length - 1].date)} />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      )}
    </div>
  );
}
