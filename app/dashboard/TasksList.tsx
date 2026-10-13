"use client";

import { motion } from "motion/react";

export type TaskRow = { id: string; title: string; dueLabel: string };

// Liste libellé/date générique — historiquement les tâches en attente, ne
// sert plus qu'à la carte « Dernière activité » de ManagerOverview depuis le
// masquage du module Tasks (recentrage produit, juillet 2026).
export default function TasksList({ tasks }: { tasks: TaskRow[]; totalCount?: number }) {
  if (tasks.length === 0) {
    return <p className="text-[13px] text-slate-500">Rien à afficher.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {tasks.map((task, i) => (
        <motion.li
          key={task.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <span className="truncate text-[13px] font-medium text-slate-900">{task.title}</span>
          <span className="shrink-0 text-[11.5px] tabular-nums text-slate-500">{task.dueLabel}</span>
        </motion.li>
      ))}
    </ul>
  );
}
