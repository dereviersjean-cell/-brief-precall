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
    return <p className="text-sm text-slate-400 italic px-5 pb-5 pt-2">Aucun commercial rattaché pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full mt-3 min-w-[480px]">
      <thead>
        <tr className="border-t border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
          <th className="text-left font-semibold px-5 py-2">Commercial</th>
          <th className="text-right font-semibold px-3 py-2">Calls</th>
          <th className="text-right font-semibold px-3 py-2">Score</th>
          <th className="text-right font-semibold px-5 py-2">Statut</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <motion.tr
            key={row.userId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
            whileHover={{ backgroundColor: "var(--lavender)" }}
            className="border-t border-slate-100"
          >
            <td className="px-5 py-2.5">
              <Link href={`/team/${row.userId}`} className="text-sm font-medium text-slate-800 hover:text-[color:var(--violet)] transition-colors">
                {row.name}
              </Link>
            </td>
            <td className="px-3 py-2.5 text-right text-sm text-slate-600">{row.callsCount}</td>
            <td className={`px-3 py-2.5 text-right text-sm font-semibold ${row.avgScore !== null ? scoreColorClass(row.avgScore).text : "text-slate-300"}`}>
              {row.avgScore !== null ? row.avgScore.toFixed(1) : "—"}
            </td>
            <td className="px-5 py-2.5 text-right">
              {row.needsAttention ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--warning-soft)] text-amber-700">
                  À suivre
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--success-soft)] text-emerald-700">
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
