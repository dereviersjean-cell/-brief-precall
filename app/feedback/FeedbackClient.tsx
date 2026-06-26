"use client";

import Link from "next/link";
import type { CallWithAnalysis } from "@/lib/db";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
                      <p className="text-slate-400 text-xs mt-1">{formatDate(call.created_at)}</p>
                    </div>

                    {/* Right — email badge + score + sentiment */}
                    <div className="flex items-center gap-2 shrink-0">
                      {call.follow_up_email && (
                        <span title="Email de suivi disponible">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
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
