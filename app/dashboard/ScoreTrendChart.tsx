"use client";

import { motion } from "motion/react";
import type { ScoreTrendWeek } from "@/lib/dashboard";
import { scoreColorClass } from "@/lib/dashboard";

// Bars grow from 0 on mount, staggered left-to-right — one series (a single
// hue-family per bar, matching the app-wide score color bands), so no
// legend needed. Native title attribute stands in for a hover tooltip.
export default function ScoreTrendChart({ weeks, title }: { weeks: ScoreTrendWeek[]; title: string }) {
  const hasAnyData = weeks.some((w) => w.avgScore !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-2xl border border-slate-200 p-5"
    >
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">{title}</h2>
      {!hasAnyData ? (
        <p className="text-sm text-slate-400 italic py-8 text-center">Pas encore assez de calls analysés.</p>
      ) : (
        <div className="flex items-end justify-between gap-2 h-40">
          {weeks.map((w, i) => {
            const pct = w.avgScore !== null ? Math.max((w.avgScore / 5) * 100, 4) : 0;
            const color = w.avgScore !== null ? scoreColorClass(w.avgScore).bar : "bg-slate-100";
            return (
              <div key={w.weekStart.toISOString()} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="text-xs font-semibold text-slate-600"
                >
                  {w.avgScore !== null ? w.avgScore.toFixed(1) : "—"}
                </motion.span>
                <div className="w-full h-full flex items-end">
                  <motion.div
                    title={`${w.weekLabel} — ${w.avgScore !== null ? `${w.avgScore.toFixed(1)}/5` : "aucun call"} (${w.callsCount} call${w.callsCount !== 1 ? "s" : ""})`}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ filter: "brightness(0.92)" }}
                    className={`w-full rounded-t-md ${color}`}
                  />
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{w.weekLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
