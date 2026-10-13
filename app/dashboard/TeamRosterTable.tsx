"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { scoreColorClass } from "@/lib/dashboard";

export type RosterRow = {
  userId: string;
  name: string;
  callsCount: number;
  avgScore: number | null;
  needsAttention: boolean;
};

export default function TeamRosterTable({ rows }: { rows: RosterRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 pb-5 pt-2 text-[13px] text-slate-500 sm:px-5">Aucun commercial rattaché pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="mt-2 w-full stacked-table sm:min-w-[480px]">
      <thead>
        <tr className="border-t border-border text-[11px] uppercase tracking-[0.07em] text-slate-500">
          <th className="px-5 py-2.5 text-left font-semibold">Commercial</th>
          <th className="px-3 py-2.5 text-right font-semibold">Calls</th>
          <th className="px-3 py-2.5 text-right font-semibold">Score</th>
          <th className="px-5 py-2.5 text-right font-semibold">Statut</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <motion.tr
            key={row.userId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
            className="border-t border-border transition-colors hover:bg-slate-50"
          >
            <td className="px-5 py-3">
              <Link href={`/team/${row.userId}`} className="text-[13px] font-medium text-slate-900 transition-colors hover:text-[color:var(--violet)]">
                {row.name}
              </Link>
            </td>
            <td data-label="Calls" className="px-3 py-3 text-right text-[13px] tabular-nums text-slate-600">{row.callsCount}</td>
            <td data-label="Score" className={`px-3 py-3 text-right text-[13px] font-semibold tabular-nums ${row.avgScore !== null ? scoreColorClass(row.avgScore).text : "text-slate-300"}`}>
              {row.avgScore !== null ? row.avgScore.toFixed(1) : "—"}
            </td>
            <td data-label="Statut" className="px-5 py-3 text-right">
              {row.needsAttention ? (
                <span className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
                  À suivre
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                  Actif
                </span>
              )}
            </td>
          </motion.tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
