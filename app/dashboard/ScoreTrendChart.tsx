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
      className="rounded-2xl border border-border bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{title}</h2>
        {hasAnyData && <TrendSummary weeks={weeks} />}
      </div>
      {!hasAnyData ? (
        <p className="py-10 text-center text-[13px] text-slate-500">Pas encore assez de calls analysés.</p>
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
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-[12px] text-slate-500">sur la période</span>
      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${tone}`}>{label}</span>
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
  // Sous trois points, la moyenne passe à mi-chemin des valeurs déjà tracées :
  // elle occupe l'écran sans rien ajouter.
  const showAverage = points.length >= 3;

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
    <div className="mt-3">
      {/* La légende ne décrit que ce qui est effectivement tracé : annoncer
          « Moyenne » ou « Aucun call » quand ni l'une ni l'autre n'apparaît
          oblige à chercher à l'écran quelque chose qui n'y est pas. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[color:var(--primary)]" /> Score hebdomadaire
        </span>
        {showAverage && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dotted border-amber-400" /> Moyenne
          </span>
        )}
        {points.length < weeks.length && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Aucun call
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Évolution du score moyen">
        <defs>
          <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
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
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={pad.l - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--color-slate-400)">
              {g}
            </text>
          </g>
        ))}

        {/* Moyenne : trait ambré, lisible sur la grille grise, avec sa valeur
            dans une pastille plutôt qu'un texte flottant. */}
        {showAverage && (
          <>
        <line
          x1={pad.l}
          x2={w - pad.r}
          y1={y(avg)}
          y2={y(avg)}
          stroke="var(--warning)"
          strokeWidth={1.5}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
        <g transform={`translate(${w - pad.r - 54}, ${y(avg) - 18})`}>
          <rect width="54" height="16" rx="8" fill="var(--warning-soft)" />
          <text x="27" y="11" textAnchor="middle" fontSize="10" fontWeight={600} fill="oklch(0.5 0.11 60)">
            moy. {avg.toFixed(1)}
          </text>
        </g>
          </>
        )}

        {segments.map((seg, si) => {
          const line = seg.map((p) => `${p.x},${p.y}`).join(" ");
          const area = `${seg[0].x},${pad.t + ih} ${line} ${seg[seg.length - 1].x},${pad.t + ih}`;
          return (
            <g key={si}>
              {seg.length > 1 && <polygon points={area} fill="url(#scoreArea)" />}
              <polyline
                points={line}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={2.5}
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
              <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="var(--primary)" strokeWidth={2} />
              {(showAllValues || isLast) && (
                <>
                  {/* Fond derrière la valeur : sans lui, elle se colle à
                      l'étiquette de l'axe sur les points proches du bord
                      gauche — « 3 » et « 2.6 » se lisaient « 32.6 ». */}
                  <rect
                    x={p.x - 13}
                    y={p.y - 22}
                    width={26}
                    height={14}
                    rx={4}
                    fill="white"
                    opacity={0.92}
                  />
                  <text
                    x={p.x}
                    y={p.y - 11}
                    textAnchor="middle"
                    fontSize={isLast ? "12" : "11"}
                    fontWeight={600}
                    fill={isLast ? "var(--foreground)" : "var(--color-slate-600)"}
                  >
                    {p.value.toFixed(1)}
                  </text>
                </>
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
              fill="var(--color-slate-300)"
            />
          )
        )}

        {weeks.map((wk, i) => (
          <text
            key={`l-${wk.weekStart.toISOString()}`}
            x={x(i)}
            y={h - 8}
            textAnchor="middle"
            fontSize="10.5"
            fill="var(--color-slate-400)"
          >
            {wk.weekLabel}
          </text>
        ))}
      </svg>
    </div>
  );
}
