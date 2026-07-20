"use client";

import Link from "next/link";
import { motion } from "motion/react";

export type TaskRow = { id: string; title: string; dueLabel: string };

export default function TasksList({ tasks, totalCount }: { tasks: TaskRow[]; totalCount: number }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400 italic">Aucune tâche en attente.</p>;
  }

  return (
    <>
      <ul className="space-y-2.5">
        {tasks.map((task, i) => (
          <motion.li
            key={task.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-sm text-slate-700 truncate">{task.title}</span>
            <span className="text-xs text-slate-400 shrink-0">{task.dueLabel}</span>
          </motion.li>
        ))}
      </ul>
      {totalCount > tasks.length && (
        <Link href="/tasks" className="inline-block mt-3 text-xs font-medium text-[color:var(--violet)] hover:underline">
          Voir les {totalCount} tâches →
        </Link>
      )}
    </>
  );
}
