"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Calendar } from "lucide-react";
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

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 4
      ? "bg-[color:var(--success-soft)] text-emerald-700"
      : score >= 2.5
      ? "bg-[color:var(--warning-soft)] text-amber-700"
      : "bg-[color:var(--danger-soft)] text-rose-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${cls}`}>
      {score.toFixed(1)}/5
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const map: Record<string, string> = {
    positif: "bg-[color:var(--success-soft)] text-emerald-700",
    neutre: "bg-slate-100 text-slate-600",
    négatif: "bg-[color:var(--danger-soft)] text-rose-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${map[sentiment] ?? "bg-slate-100 text-slate-600"}`}>
      {sentiment}
    </span>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[13px] text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right text-[13px] font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

// Bloc HISTORIQUE. Brief ne détecte plus les réponses depuis le retrait de
// gmail.metadata (19/08/2026, cf. lib/auth.ts) : `replied_at` n'est plus
// jamais alimenté, donc ce bloc n'apparaît que sur les échanges antérieurs.
// Il est conservé parce qu'il reste vrai — ces prospects ont réellement
// répondu — et parce qu'il porte le formulaire de relance manuelle
// (send-reply, scope gmail.send, conservé). Les AGRÉGATS ont été retirés au
// même moment : un taux de réponse figé à 0 % aurait laissé croire que
// personne ne répond, alors qu'on a seulement cessé de mesurer.
function ReplyEntry({ item }: { item: ContactTimelineItem }) {
  const [replyText, setReplyText] = useState("");
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [successToast, setSuccessToast] = useState(false);

  if (!item.replied_at) return null;

  return (
    <div className="mt-3 ml-4 relative pl-8">
      {/* Sub-dot */}
      <div className="absolute left-0 top-2.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[color:var(--primary)] bg-white">
        <div className="h-1 w-1 rounded-full bg-[color:var(--primary)]" />
      </div>

      <div className="overflow-hidden rounded-xl bg-[color:var(--lavender)]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-900">Le prospect a répondu</p>
            <p className="mt-0.5 text-[11.5px] text-slate-500">{formatDateTime(item.replied_at)}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setShowReplyForm((v) => !v); setSendStatus("idle"); }}
              className="rounded-lg border border-[color:var(--lavender-strong)] bg-white px-2.5 py-1 text-[12px] font-medium text-[color:var(--violet)] transition-colors hover:bg-white/80"
            >
              {showReplyForm ? "Refermer" : "Répondre"}
            </button>
          </div>
        </div>

        {/* Success toast */}
        {successToast && (
          <div className="mx-4 mt-3 flex items-center justify-between gap-4 rounded-xl bg-[color:var(--success-soft)] px-4 py-2.5">
            <p className="text-sm font-medium text-emerald-700">Email envoyé avec succès.</p>
            <button onClick={() => setSuccessToast(false)} className="text-emerald-400 hover:text-emerald-600 text-lg leading-none shrink-0">×</button>
          </div>
        )}

        {/* Inline reply form */}
        {showReplyForm && (
          <div className="border-t border-[color:var(--lavender-strong)] px-4 pb-3 pt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
              placeholder="Votre message de relance…"
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/40"
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
                className="rounded-lg bg-[color:var(--primary)] px-3 py-1.5 text-[12px] font-medium text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendStatus === "sending" ? "Envoi…" : "Envoyer"}
              </button>
              <button
                onClick={() => { setShowReplyForm(false); setSendStatus("idle"); }}
                className="px-2 py-1.5 text-[12px] text-slate-500 transition-colors hover:text-slate-900"
              >
                Annuler
              </button>
              {sendStatus === "error" && (
                <p className="text-[12px] text-rose-700">Erreur lors de l&apos;envoi, réessaie.</p>
              )}
            </div>
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
      <div className="absolute left-0 top-2.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[color:var(--success)] bg-white">
        <div className="h-1 w-1 rounded-full bg-[color:var(--success)]" />
      </div>

      <div className="overflow-hidden rounded-xl bg-[color:var(--success-soft)]">
        {/* Header row — always visible, clickable */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
        >
          <svg className="h-4 w-4 shrink-0 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
            <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-slate-900">
              {item.follow_up_email.subject}
            </p>
            <p className="mt-0.5 text-[11.5px] text-slate-500">
              {item.follow_up_sent_at
                ? `Envoyé le ${formatDate(item.follow_up_sent_at)}`
                : "Brouillon généré"}
            </p>
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
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
          <div className="border-t border-white/70 px-4 pb-4">
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-white px-3 py-3 font-sans text-[13px] leading-relaxed text-slate-600">
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
  const totalDurationSeconds = timeline.reduce((n, i) => n + (i.duration_seconds ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <FadeIn>
        <Link href="/contacts" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-[color:var(--violet)]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Tous les contacts
        </Link>

        {/* En-tête du contact */}
        <div className="mb-4 rounded-2xl border border-border bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[color:var(--lavender)]">
              <span className="text-[17px] font-semibold text-[color:var(--violet)]">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-900">{displayName}</h1>
              {contactEmail !== displayName && <p className="mt-1 break-all text-[13px] text-slate-500">{contactEmail}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {videoCallCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
                    <VideoIcon className="w-3 h-3 shrink-0" />
                    {videoCallCount} {videoCallCount === 1 ? "visio enregistrée" : "visios enregistrées"}
                  </span>
                )}
                {emailsSentCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                    <EnvelopeIcon className="w-3 h-3 shrink-0" />
                    {emailsSentCount} {emailsSentCount === 1 ? "email envoyé" : "emails envoyés"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {timeline.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
            <Calendar className="h-5 w-5 text-[color:var(--violet)]" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-semibold text-slate-900">Aucun call enregistré pour ce contact</p>
          <p className="mt-1 text-[13px] text-slate-500">L&apos;historique apparaîtra ici après un premier call.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* LEFT — vertical timeline */}
          <div className="min-w-0 relative">
            <div className="absolute bottom-2 left-4 top-2 w-px bg-border" />

            <div className="space-y-0">
              {timeline.map((item, idx) => {
                const score = item.analysis?.global_score ?? null;
                const isLast = idx === timeline.length - 1;

                return (
                  <div key={item.id} className={`relative pl-12 ${isLast ? "" : "pb-6"}`}>
                    {/* Dot */}
                    <div className="absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[color:var(--primary)] bg-white">
                      <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
                    </div>

                    {/* Call card */}
                    <Link
                      href={`/feedback/${item.id}`}
                      className="block rounded-2xl border border-border bg-white p-4 transition-colors hover:border-[color:var(--lavender-strong)] sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                            <p className="text-[13.5px] font-semibold text-slate-900">{formatDateTime(item.date)}</p>
                          </div>
                          <p className="mt-1 flex items-center gap-2 text-[11.5px] tabular-nums text-slate-500">
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
                        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                          {item.analysis.summary}
                        </p>
                      )}

                      {!item.analysis && (
                        <p className="mt-3 text-[12px] text-slate-400">Analyse en attente…</p>
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
              <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
                <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Résumé</h2>
                <div className="divide-y divide-border">
                  {totalDurationSeconds > 0 && (
                    <SummaryRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Durée totale échangée" value={formatTotalDuration(totalDurationSeconds)} />
                  )}
                  <SummaryRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Premier échange" value={formatDate(timeline[0].date)} />
                  <SummaryRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Dernier échange" value={formatDate(timeline[timeline.length - 1].date)} />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      )}
    </div>
  );
}
