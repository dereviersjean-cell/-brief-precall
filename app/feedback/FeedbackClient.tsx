"use client";

import Link from "next/link";
import type { CallWithAnalysis } from "@/lib/db";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
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

export default function FeedbackClient({ calls }: { calls: CallWithAnalysis[] }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Feedback post-call</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Analyse de vos appels commerciaux par l&apos;IA.
          </p>
        </div>

        {calls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Aucun appel analysé pour l&apos;instant</p>
            <p className="text-slate-400 text-sm mt-1">
              Vos analyses apparaîtront ici après chaque appel enregistré via Recall.AI.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {calls.map((call) => {
              const score = call.analysis?.scores?.global_score ?? null;
              return (
                <Link
                  key={call.id}
                  href={`/feedback/${call.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left — name + date */}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {call.company_name || call.contact_email || "Contact inconnu"}
                      </p>
                      {call.company_name && call.contact_email && (
                        <p className="text-slate-400 text-xs mt-0.5 truncate">{call.contact_email}</p>
                      )}
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-2 flex-wrap">
                        <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
                        {(call.duration_seconds !== null || call.recall_bot_id) && (
                          <span className="flex items-center gap-1">
                            {call.duration_seconds !== null && (
                              <>
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                                </svg>
                                {formatDuration(call.duration_seconds)}
                              </>
                            )}
                            {call.recall_bot_id && (
                              <svg className="w-3 h-3 shrink-0 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            )}
                          </span>
                        )}
                        {call.participant_count !== null && (
                          <span>{call.participant_count} {call.participant_count === 1 ? "participant" : "participants"}</span>
                        )}
                      </p>
                    </div>

                    {/* Right — email badge + score + sentiment */}
                    <div className="flex items-center gap-2 shrink-0">
                      {call.follow_up_email && !call.follow_up_sent_at && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Brouillon généré
                        </span>
                      )}
                      {call.follow_up_sent_at && (
                        <span
                          title={new Date(call.follow_up_sent_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          className="inline-flex items-center gap-1 text-emerald-600"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                            <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                          </svg>
                          <span className="text-xs font-medium">Envoyé</span>
                        </span>
                      )}
                      {call.analysis?.sentiment && (
                        <SentimentBadge sentiment={call.analysis.sentiment} />
                      )}
                      {score !== null && <ScoreBadge score={score} />}
                    </div>
                  </div>

                  {/* Summary */}
                  {call.analysis?.summary && (
                    <p className="text-slate-500 text-sm mt-3 leading-relaxed line-clamp-2">
                      {call.analysis.summary}
                    </p>
                  )}

                  {!call.analysis && (
                    <p className="text-slate-300 text-xs mt-3 italic">Analyse en attente…</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
