"use client";

import { useEffect, useState } from "react";
import type { TaskListItem } from "@/lib/db";

const SESSION_KEY = "brief_tasks_overdue_toast_dismissed";

export default function TasksOverdueToast() {
  const [overdueCount, setOverdueCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let cancelled = false;
    fetch("/api/tasks?filter=pending")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TaskListItem[]) => {
        if (cancelled) return;
        const now = Date.now();
        const overdue = data.filter((t) => new Date(t.due_at).getTime() < now);
        if (overdue.length > 0) {
          setOverdueCount(overdue.length);
          setVisible(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => handleClose(), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  function handleClose() {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="brief-ui fixed top-4 right-4 left-4 z-50 sm:left-auto sm:max-w-sm">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-[var(--shadow-md)]">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[color:var(--warning)]" aria-hidden />
        <p className="flex-1 text-[13px] leading-relaxed text-slate-700">
          ⚠️ Vous avez {overdueCount} task{overdueCount > 1 ? "s" : ""} en retard
        </p>
        <button
          onClick={handleClose}
          className="shrink-0 rounded-md px-1 text-[16px] leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
