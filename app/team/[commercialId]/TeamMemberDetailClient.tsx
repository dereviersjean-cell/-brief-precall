"use client";

import Link from "next/link";
import type { CommercialDetailForManager } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";

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

function TrendBlock({ trend }: { trend: CommercialDetailForManager["trend"] }) {
  if (!trend || trend.recent_avg_score === null) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Tendance</p>
        <p className="mt-2 text-[13px] text-slate-500">Pas encore assez d&apos;appels analysés pour dégager une tendance.</p>
      </div>
    );
  }

  if (trend.previous_avg_score === null) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Tendance</p>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{trend.recent_avg_score.toFixed(1)}/5</span>
          <span className="text-[13px] text-slate-500">(5 derniers appels)</span>
        </div>
        <p className="mt-2 text-[12px] text-slate-500">Pas assez d&apos;historique antérieur pour comparer.</p>
      </div>
    );
  }

  const diff = trend.recent_avg_score - trend.previous_avg_score;
  const isUp = diff > 0.05;
  const isDown = diff < -0.05;

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Tendance</p>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{trend.recent_avg_score.toFixed(1)}/5</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${
            isUp
              ? "bg-[color:var(--success-soft)] text-emerald-700"
              : isDown
              ? "bg-[color:var(--danger-soft)] text-rose-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isUp && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          )}
          {isDown && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          )}
          {diff > 0 ? "+" : ""}
          {diff.toFixed(1)}
        </span>
      </div>
      <p className="mt-2 text-[12px] tabular-nums text-slate-500">
        vs {trend.previous_avg_score.toFixed(1)}/5 sur les 5 appels précédents
      </p>
    </div>
  );
}

export default function TeamMemberDetailClient({ detail }: { detail: CommercialDetailForManager }) {
  const briefs = (detail.briefs ?? []) as BriefSummary[];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Back link */}
        <Link
          href="/team"
          className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour à l&apos;équipe
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="break-words text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">{detail.name || detail.email}</h1>
          {detail.name && <p className="mt-2 break-all text-[15px] text-slate-500">{detail.email}</p>}
        </div>

        {/* Trend */}
        <div className="mb-8">
          <TrendBlock trend={detail.trend} />
        </div>

        {/* Recent calls */}
        <div className="mb-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Appels récents</h2>
          {detail.calls.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center">
              <p className="text-[13px] text-slate-500">Aucun appel analysé pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {detail.calls.map((call) => {
                const score = call.analysis?.scores?.global_score ?? null;
                return (
                  <Link
                    key={call.id}
                    href={`/team/${detail.user_id}/calls/${call.id}`}
                    className="block rounded-2xl border border-border bg-white px-4 py-3.5 transition-colors hover:border-slate-300 sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-slate-900">
                          {formatContactDisplayName(call.company_name, call.contact_email)}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] tabular-nums text-slate-500">
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

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {call.analysis?.sentiment && <SentimentBadge sentiment={call.analysis.sentiment} />}
                        {score !== null && <ScoreBadge score={score} />}
                      </div>
                    </div>

                    {call.analysis?.summary && (
                      <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{call.analysis.summary}</p>
                    )}
                    {!call.analysis && <p className="mt-2.5 text-[12px] italic text-slate-400">Analyse en attente…</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Briefs history */}
        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Briefs générés</h2>
          {briefs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center">
              <p className="text-[13px] text-slate-500">Aucun brief généré pour l&apos;instant.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border bg-white">
              {briefs.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                  <span className="truncate text-[13px] font-medium text-slate-900">{b.company_name || "Entreprise inconnue"}</span>
                  <span className="whitespace-nowrap text-[12px] tabular-nums text-slate-500">{formatDate(b.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
