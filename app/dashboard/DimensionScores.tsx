"use client";

import { motion } from "motion/react";
import { scoreColorClass } from "@/lib/dashboard";

export type DimensionRow = { key: string; label: string; average: number | null };

export default function DimensionScores({ dimensions }: { dimensions: DimensionRow[] }) {
  return (
    <div className="space-y-4">
      {dimensions.map((dim, i) => (
        <div key={dim.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-slate-600">{dim.label}</span>
            <span className="text-sm font-semibold text-slate-800">{dim.average !== null ? dim.average.toFixed(1) : "—"}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dim.average !== null ? (dim.average / 5) * 100 : 0}%` }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${dim.average !== null ? scoreColorClass(dim.average).bar : "bg-slate-200"}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
