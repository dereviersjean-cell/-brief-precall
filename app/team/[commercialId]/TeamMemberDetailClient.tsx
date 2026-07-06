"use client";

import Link from "next/link";
import type { CommercialDetailForManager } from "@/lib/db";

type BriefSummary = {
  id: string;
  company_name: string | null;
  created_at: string;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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

function TrendBlock({ trend }: { trend: CommercialDetailForManager["trend"] }) {
  if (!trend || trend.recent_avg_score === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tendance</p>
        <p className="text-slate-500 text-sm mt-2">Pas encore assez d&apos;appels analysés pour dégager une tendance.</p>
      </div>
    );
  }

  if (trend.previous_avg_score === null) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tendance</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-slate-900">{trend.recent_avg_score.toFixed(1)}/5</span>
          <span className="text-slate-400 text-sm">(5 derniers appels)</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">Pas assez d&apos;historique antérieur pour comparer.</p>
      </div>
    );
  }

  const diff = trend.recent_avg_score - trend.previous_avg_score;
  const isUp = diff > 0.05;
  const isDown = diff < -0.05;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tendance</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900">{trend.recent_avg_score.toFixed(1)}/5</span>
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold ${
            isUp ? "text-green-600" : isDown ? "text-red-600" : "text-slate-400"
          }`}
        >
          {isUp && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          )}
          {isDown && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          )}
          {diff > 0 ? "+" : ""}
          {diff.toFixed(1)}
        </span>
      </div>
      <p className="text-slate-400 text-xs mt-1">
        vs {trend.previous_avg_score.toFixed(1)}/5 sur les 5 appels précédents
      </p>
    </div>
  );
}

export default function TeamMemberDetailClient({ detail }: { detail: CommercialDetailForManager }) {
  const briefs = (detail.briefs ?? []) as BriefSummary[];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour à l&apos;équipe
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">{detail.name || detail.email}</h1>
          {detail.name && <p className="text-slate-500 mt-1 text-sm">{detail.email}</p>}
        </div>

        {/* Trend */}
        <div className="mb-8">
          <TrendBlock trend={detail.trend} />
        </div>

        {/* Recent calls */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Appels récents</h2>
          {detail.calls.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500 text-sm">Aucun appel analysé pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.calls.map((call) => {
                const score = call.analysis?.scores?.global_score ?? null;
                return (
                  <Link
                    key={call.id}
                    href={`/feedback/${call.id}`}
                    className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {call.company_name || call.contact_email || "Contact inconnu"}
                        </p>
                        <p className="text-slate-400 text-xs mt-1 flex items-center gap-2 flex-wrap">
                          <span>{formatDateTime(call.started_at ?? call.created_at)}</span>
                          {call.duration_seconds !== null && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                              </svg>
                              {formatDuration(call.duration_seconds)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {call.analysis?.sentiment && <SentimentBadge sentiment={call.analysis.sentiment} />}
                        {score !== null && <ScoreBadge score={score} />}
                      </div>
                    </div>

                    {call.analysis?.summary && (
                      <p className="text-slate-500 text-sm mt-3 leading-relaxed line-clamp-2">{call.analysis.summary}</p>
                    )}
                    {!call.analysis && <p className="text-slate-300 text-xs mt-3 italic">Analyse en attente…</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Briefs history */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Briefs générés</h2>
          {briefs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500 text-sm">Aucun brief généré pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100">
              {briefs.map((b) => (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-slate-800 truncate">{b.company_name || "Entreprise inconnue"}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(b.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
