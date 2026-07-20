"use client";

import { motion } from "motion/react";
import type { ScoreTrendWeek } from "@/lib/dashboard";

// Porté du mockup Lovable (index.tsx ScoreChart), juillet 2026 — SVG pur,
// aucune dépendance de lib de graphes. Axe 0-5, ligne moyenne pointillée,
// barres avec dégradé + contour violet pour les semaines avec données,
// simple trait pour les semaines vides.
export default function ScoreTrendChart({ weeks, title }: { weeks: ScoreTrendWeek[]; title: string }) {
  const hasAnyData = weeks.some((w) => w.avgScore !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{title}</h2>
        {hasAnyData && (
          <div className="flex items-center gap-4 text-[12px] text-slate-500 shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[color:var(--violet)]" /> Score
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-[2px] w-4 rounded bg-slate-300" /> Moyenne
            </span>
          </div>
        )}
      </div>
      {!hasAnyData ? (
        <p className="text-sm text-slate-400 italic py-8 text-center">Pas encore assez de calls analysés.</p>
      ) : (
        <ScoreChart weeks={weeks} />
      )}
    </motion.div>
  );
}

function ScoreChart({ weeks }: { weeks: ScoreTrendWeek[] }) {
  const w = 640;
  const h = 200;
  const pad = { l: 28, r: 12, t: 24, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const max = 5;
  const step = weeks.length > 1 ? iw / (weeks.length - 1) : iw;
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const valid = weeks.filter((wk) => wk.avgScore !== null) as (ScoreTrendWeek & { avgScore: number })[];
  const avg = valid.length ? valid.reduce((s, p) => s + p.avgScore, 0) / valid.length : null;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[200px]">
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4, 5].map((g) => (
          <line key={g} x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} stroke="oklch(0.94 0.01 258)" strokeWidth={1} />
        ))}
        {[0, 5].map((g) => (
          <text key={g} x={pad.l - 6} y={y(g) + 3} textAnchor="end" fontSize="10" fill="oklch(0.55 0.03 257)">
            {g}
          </text>
        ))}

        {avg != null && (
          <>
            <line x1={pad.l} x2={w - pad.r} y1={y(avg)} y2={y(avg)} stroke="oklch(0.75 0.03 260)" strokeWidth={1} strokeDasharray="3 4" />
            <text x={w - pad.r} y={y(avg) - 4} textAnchor="end" fontSize="10" fill="oklch(0.45 0.03 260)">
              moy. {avg.toFixed(1)}
            </text>
          </>
        )}

        {weeks.map((wk, i) => {
          if (wk.avgScore == null) return null;
          const cx = pad.l + i * step;
          const barW = 26;
          const barH = (wk.avgScore / max) * ih;
          return (
            <g key={wk.weekStart.toISOString()}>
              <rect
                x={cx - barW / 2}
                y={pad.t + ih - barH}
                width={barW}
                height={barH}
                rx={6}
                fill="url(#scoreArea)"
                stroke="var(--violet)"
                strokeWidth={1.25}
              />
              <text x={cx} y={pad.t + ih - barH - 6} textAnchor="middle" fontSize="11" fontWeight={600} fill="oklch(0.3 0.1 258)">
                {wk.avgScore.toFixed(1)}
              </text>
            </g>
          );
        })}

        {weeks.map((wk, i) => {
          if (wk.avgScore != null) return null;
          const cx = pad.l + i * step;
          return (
            <line
              key={`empty-${wk.weekStart.toISOString()}`}
              x1={cx - 8}
              x2={cx + 8}
              y1={pad.t + ih - 4}
              y2={pad.t + ih - 4}
              stroke="oklch(0.85 0.01 258)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {weeks.map((wk, i) => {
          const cx = pad.l + i * step;
          return (
            <text key={`l-${wk.weekStart.toISOString()}`} x={cx} y={h - 8} textAnchor="middle" fontSize="10.5" fill="oklch(0.55 0.03 257)">
              {wk.weekLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
