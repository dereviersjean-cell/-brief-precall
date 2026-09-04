"use client";

import { motion } from "motion/react";
import { scoreColorClass } from "@/lib/dashboard";

export type DimensionRow = { key: string; label: string; average: number | null };

// Refait le 04/09/2026. La version précédente affichait des barres de 6 px
// sans aucune graduation : on lisait « 3,4 » à droite sans pouvoir situer ce
// que valait la barre, ni voir d'un coup d'œil quelle dimension décrochait.
//
// Deux ajouts qui font tout le travail : des graduations 1 à 4 en fond (le
// score est sur 5, l'échelle devient lisible sans la chercher), et la
// dimension la plus faible signalée explicitement — c'est la seule qui
// appelle une action.
export default function DimensionScores({ dimensions }: { dimensions: DimensionRow[] }) {
  const scored = dimensions.filter((d) => d.average !== null) as (DimensionRow & { average: number })[];
  // Signalé seulement s'il y a de quoi comparer, et si l'écart est réel : sur
  // trois dimensions à 0,1 point d'écart, désigner « la plus faible » serait
  // arbitraire.
  const weakest =
    scored.length >= 2 &&
    Math.max(...scored.map((d) => d.average)) - Math.min(...scored.map((d) => d.average)) >= 0.3
      ? scored.reduce((min, d) => (d.average < min.average ? d : min))
      : null;

  return (
    <div className="space-y-3.5">
      {dimensions.map((dim, i) => {
        const isWeakest = weakest?.key === dim.key;
        return (
          <div key={dim.key}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-sm text-slate-600 flex items-center gap-2 min-w-0">
                <span className="truncate">{dim.label}</span>
                {isWeakest && (
                  <span className="shrink-0 rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[10.5px] font-medium text-amber-700">
                    à travailler
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold text-slate-800 shrink-0 tabular-nums">
                {dim.average !== null ? (
                  <>
                    {dim.average.toFixed(1)}
                    <span className="text-slate-300 font-normal"> / 5</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>

            <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
              {/* Graduations 1..4 : l'échelle se lit sur la barre elle-même,
                  au lieu d'être déduite du chiffre à côté. */}
              {[1, 2, 3, 4].map((g) => (
                <span
                  key={g}
                  className="absolute top-0 bottom-0 w-px bg-white/70"
                  style={{ left: `${(g / 5) * 100}%` }}
                />
              ))}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dim.average !== null ? (dim.average / 5) * 100 : 0}%` }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute inset-y-0 left-0 rounded-full ${
                  dim.average !== null ? scoreColorClass(dim.average).bar : "bg-slate-200"
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
