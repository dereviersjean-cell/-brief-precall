"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContactTimelineItem } from "@/lib/db";

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
  const displayName = timeline[0]?.company_name || contactEmail;
  const videoCallCount = timeline.length;
  const emailsSentCount = timeline.filter((i) => !!i.follow_up_sent_at).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-2">
          <Link href="/contacts" className="text-xs text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1 mb-4">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Tous les contacts
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
          {timeline[0]?.company_name && (
            <p className="text-slate-400 text-sm mt-0.5">{contactEmail}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {videoCallCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                {videoCallCount} {videoCallCount === 1 ? "visio enregistrée" : "visios enregistrées"}
              </span>
            )}
            {emailsSentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                  <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                </svg>
                {emailsSentCount} {emailsSentCount === 1 ? "email envoyé" : "emails envoyés"}
              </span>
            )}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center mt-8">
            <p className="text-slate-500 text-sm">Aucun call enregistré pour ce contact.</p>
          </div>
        ) : (
          <div className="mt-8 relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />

            <div className="space-y-0">
              {timeline.map((item, idx) => {
                const score = item.analysis?.global_score ?? null;
                const isLast = idx === timeline.length - 1;

                return (
                  <div key={item.id} className={`relative pl-12 ${isLast ? "" : "pb-6"}`}>
                    {/* Dot */}
                    <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-white border-2 border-indigo-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>

                    {/* Call card */}
                    <Link
                      href={`/feedback/${item.id}`}
                      className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
