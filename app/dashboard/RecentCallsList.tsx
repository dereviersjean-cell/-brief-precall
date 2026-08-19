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
    return <p className="text-sm text-slate-400 italic">Aucun call pour l&apos;instant.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
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
              <p className="text-sm font-medium text-slate-800 group-hover:text-[color:var(--violet)] transition-colors truncate">
                {call.name}
              </p>
              <p className="text-xs text-slate-400">{call.dateLabel}</p>
            </div>
            {call.score !== null && (
              <span className={`text-sm font-semibold shrink-0 ${scoreColorClass(call.score).text}`}>
                {call.score.toFixed(1)}/5
              </span>
            )}
          </ConditionalLink>
        </motion.div>
      ))}
    </div>
  );
}
