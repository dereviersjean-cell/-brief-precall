"use client";

import ConditionalLink from "@/app/components/ui/ConditionalLink";
import { motion } from "motion/react";
import { scoreColorClass } from "@/lib/dashboard";

export type RecentCallRow = { id: string; name: string; dateLabel: string; score: number | null };

export default function RecentCallsList({
  calls,
  // false sur les écrans de démonstration : les calls n'existent pas en base.
  linksEnabled = true,
}: {
  calls: RecentCallRow[];
  linksEnabled?: boolean;
}) {
  if (calls.length === 0) {
    return <p className="text-[13px] text-slate-500">Aucun call pour l&apos;instant.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {calls.map((call, i) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
        >
          {/* En démonstration les calls n'existent pas en base : un lien
              mènerait à la vraie page de détail, qui interrogerait Postgres
              avec un identifiant fictif. Ligne inerte plutôt que lien mort. */}
          <ConditionalLink href={linksEnabled ? `/feedback/${call.id}` : null} className="flex items-center justify-between gap-3 py-2.5 group">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-slate-900 transition-colors group-hover:text-[color:var(--violet)]">
                {call.name}
              </p>
              <p className="text-[11.5px] text-slate-500">{call.dateLabel}</p>
            </div>
            {call.score !== null && (
              <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${scoreColorClass(call.score).text}`}>
                {call.score.toFixed(1)}/5
              </span>
            )}
          </ConditionalLink>
        </motion.div>
      ))}
    </div>
  );
}
