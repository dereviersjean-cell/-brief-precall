"use client";

import { motion } from "motion/react";
import type { ScoreTrendWeek } from "@/lib/dashboard";

// Refait le 04/09/2026 : la version précédente (barres translucides à contour
// violet, portée du mockup Lovable) répondait mal à la seule question que se
// pose un commercial devant cet écran — « est-ce que je progresse ? ».
//
// Trois défauts corrigés :
//  - des BARRES pour une série temporelle : elles invitent à comparer des
//    semaines deux à deux, alors que l'information est la pente. Une courbe
//    la donne d'un coup d'œil ;
//  - une grille à six lignes dont deux seulement étaient étiquetées (0 et 5) :
//    impossible de situer un point entre les deux ;
//  - la moyenne en pointillés gris clair, à peine distincte des lignes de
//    grille qu'elle croisait.
//
// SVG à la main, sans librairie de graphes — comme le reste de l'app.
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
        {hasAnyData && <TrendSummary weeks={weeks} />}
      </div>
      {!hasAnyData ? (
        <p className="text-sm text-slate-400 italic py-8 text-center">Pas encore assez de calls analysés.</p>
      ) : (
        <ScoreChart weeks={weeks} />
      )}
    </motion.div>
  );
}

// L'évolution en toutes lettres, pour ne pas obliger à interpréter une pente.
function TrendSummary({ weeks }: { weeks: ScoreTrendWeek[] }) {
  const valid = weeks.filter((w) => w.avgScore !== null) as (ScoreTrendWeek & { avgScore: number })[];
  if (valid.length < 2) return null;

  const first = valid[0].avgScore;
  const last = valid[valid.length - 1].avgScore;
  const delta = last - first;
  // Sous 0,1 point l'écart n'est pas un mouvement, c'est du bruit.
  const flat = Math.abs(delta) < 0.1;

  const tone = flat
    ? "bg-slate-100 text-slate-600"
    : delta > 0
    ? "bg-[color:var(--success-soft)] text-emerald-700"
    : "bg-[color:var(--danger-soft)] text-rose-700";
  const label = flat ? "stable" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} pt`;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[12px] text-slate-400">sur la période</span>
      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${tone}`}>{label}</span>
    </div>
  );
}

function ScoreChart({ weeks }: { weeks: ScoreTrendWeek[] }) {
  const w = 640;
  const h = 210;
  const pad = { l: 30, r: 16, t: 22, b: 30 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const max = 5;
  const step = weeks.length > 1 ? iw / (weeks.length - 1) : iw;
  const x = (i: number) => pad.l + i * step;
  const y = (v: number) => pad.t + ih - (v / max) * ih;

  const points = weeks
    .map((wk, i) => (wk.avgScore == null ? null : { i, x: x(i), y: y(wk.avgScore), value: wk.avgScore, week: wk }))
    .filter(Boolean) as { i: number; x: number; y: number; value: number; week: ScoreTrendWeek }[];

  const avg = points.reduce((s, p) => s + p.value, 0) / points.length;

  // Les semaines sans call coupent la courbe au lieu d'être reliées : tracer
  // un segment par-dessus un trou inventerait une progression qui n'a pas eu
  // lieu. Chaque suite de semaines consécutives forme donc son propre tracé.
  const segments: (typeof points)[] = [];
  for (const p of points) {
    const last = segments[segments.length - 1];
    if (last && p.i === last[last.length - 1].i + 1) last.push(p);
    else segments.push([p]);
  }

  // Les valeurs au-dessus des points deviennent illisibles dès qu'elles se
  // touchent : au-delà de 8 semaines on ne garde que le dernier point, qui
  // est celui qu'on regarde.
  const showAllValues = points.length <= 8;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[210px]" role="img" aria-label="Évolution du score moyen">
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille : toutes les graduations sont désormais étiquetées, sinon
            elles ne servent qu'à décorer. */}
        {[0, 1, 2, 3, 4, 5].map((g) => (
          <g key={g}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(g)}
              y2={y(g)}
              stroke="oklch(0.94 0.01 258)"
              strokeWidth={1}
            />
            <text x={pad.l - 8} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="oklch(0.6 0.03 257)">
              {g}
            </text>
          </g>
        ))}

        {/* Moyenne : trait plein ambré, lisible sur la grille grise, avec sa
            valeur dans une pastille plutôt qu'un texte flottant. */}
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={y(avg)}
          y2={y(avg)}
          stroke="oklch(0.75 0.13 70)"
          strokeWidth={1.25}
          strokeDasharray="5 4"
        />
        <g transform={`translate(${w - pad.r - 52}, ${y(avg) - 17})`}>
          <rect width="52" height="15" rx="7.5" fill="oklch(0.97 0.03 80)" />
          <text x="26" y="10.5" textAnchor="middle" fontSize="9.5" fontWeight={600} fill="oklch(0.5 0.11 60)">
            moy. {avg.toFixed(1)}
          </text>
        </g>

        {segments.map((seg, si) => {
          const line = seg.map((p) => `${p.x},${p.y}`).join(" ");
          const area = `${seg[0].x},${pad.t + ih} ${line} ${seg[seg.length - 1].x},${pad.t + ih}`;
          return (
            <g key={si}>
              {seg.length > 1 && <polygon points={area} fill="url(#scoreArea)" />}
              <polyline
                points={line}
                fill="none"
                stroke="var(--violet)"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {points.map((p, idx) => {
          const isLast = idx === points.length - 1;
          return (
            <g key={`p-${p.i}`}>
              <circle cx={p.x} cy={p.y} r={isLast ? 5 : 3.5} fill="white" stroke="var(--violet)" strokeWidth={2.25} />
              {(showAllValues || isLast) && (
                <text
                  x={p.x}
                  y={p.y - 11}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isLast ? 700 : 600}
                  fill="oklch(0.3 0.1 258)"
                >
                  {p.value.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* Semaines sans call : marquées au sol, distinctes d'un score de 0 —
            qui serait une contre-performance, pas une absence. */}
        {weeks.map((wk, i) =>
          wk.avgScore != null ? null : (
            <circle
              key={`empty-${wk.weekStart.toISOString()}`}
              cx={x(i)}
              cy={pad.t + ih}
              r={2.5}
              fill="oklch(0.85 0.01 258)"
            />
          )
        )}

        {weeks.map((wk, i) => (
          <text
            key={`l-${wk.weekStart.toISOString()}`}
            x={x(i)}
            y={h - 9}
            textAnchor="middle"
            fontSize="10.5"
            fill="oklch(0.55 0.03 257)"
          >
            {wk.weekLabel}
          </text>
        ))}
      </svg>

      <div className="mt-1 flex items-center justify-center gap-4 text-[11.5px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded bg-[color:var(--violet)]" /> Score hebdomadaire
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded bg-amber-300" /> Moyenne
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Aucun call
        </span>
      </div>
    </div>
  );
}
