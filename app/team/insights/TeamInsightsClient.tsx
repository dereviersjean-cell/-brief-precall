"use client";

import { Trophy, MessageSquareWarning } from "lucide-react";
import type { ObjectionStat, DimensionScoreByOutcome } from "@/lib/db";
import FadeIn from "@/app/dashboard/FadeIn";

function successRate(stat: ObjectionStat): number | null {
  const resolved = stat.wonCount + stat.lostCount;
  if (resolved === 0) return null;
  return (stat.wonCount / resolved) * 100;
}

function SuccessBadge({ stat }: { stat: ObjectionStat }) {
  const rate = successRate(stat);
  if (rate === null) {
    return <span className="text-xs text-slate-400">Issue inconnue</span>;
  }
  const cls = rate >= 60 ? "bg-green-100 text-green-700" : rate >= 30 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {Math.round(rate)}% de succès ({stat.wonCount}/{stat.wonCount + stat.lostCount})
    </span>
  );
}

function DimensionCompareBar({ dimension }: { dimension: DimensionScoreByOutcome }) {
  const wonPct = dimension.wonAverage != null ? (dimension.wonAverage / 5) * 100 : 0;
  const lostPct = dimension.lostAverage != null ? (dimension.lostAverage / 5) * 100 : 0;
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{dimension.label}</span>
        <span className="text-xs text-slate-400">
          {dimension.wonCount + dimension.lostCount === 0 ? "Pas assez de données" : `${dimension.wonCount} gagnés · ${dimension.lostCount} perdus`}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-10 text-green-600 font-medium shrink-0">Gagné</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${wonPct}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right shrink-0">{dimension.wonAverage != null ? dimension.wonAverage.toFixed(1) : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-10 text-red-500 font-medium shrink-0">Perdu</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-300 rounded-full transition-all" style={{ width: `${lostPct}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right shrink-0">{dimension.lostAverage != null ? dimension.lostAverage.toFixed(1) : "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function TeamInsightsClient({
  objectionStats,
  dimensionScores,
}: {
  objectionStats: ObjectionStat[];
  dimensionScores: DimensionScoreByOutcome[];
}) {
  const hasEnoughDimensionData = dimensionScores.some((d) => d.wonCount + d.lostCount > 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[color:var(--lavender-strong)]/60 via-[color:var(--lavender)]/40 to-transparent blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
              <Trophy className="w-3 h-3" />
              Win / loss
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
            <p className="text-slate-500 text-sm mt-1">
              Pourquoi l&apos;équipe gagne, pourquoi elle perd — à partir des objections rencontrées et des devis/deals résolus.
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareWarning className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objections les plus fréquentes</h2>
          </div>
          {objectionStats.length === 0 ? (
            <p className="text-slate-400 text-sm italic">
              Aucune objection enregistrée pour l&apos;instant — elles apparaissent ici au fur et à mesure des calls analysés.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {objectionStats.slice(0, 20).map((stat, i) => (
                <li key={i} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700">{stat.objection}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {stat.occurrences} occurrence{stat.occurrences > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <SuccessBadge stat={stat} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Scores par dimension — gagné vs perdu</h2>
          {!hasEnoughDimensionData ? (
            <p className="text-slate-400 text-sm italic mt-3">
              Pas encore assez de deals résolus (devis acceptés/refusés ou deals CRM fermés) pour comparer les scores.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {dimensionScores.map((d) => (
                <DimensionCompareBar key={d.key} dimension={d} />
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
