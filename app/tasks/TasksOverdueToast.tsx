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
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white border border-amber-200 shadow-lg rounded-xl px-4 py-3 flex items-start gap-3">
        <p className="text-sm text-slate-700 flex-1">
          ⚠️ Vous avez {overdueCount} task{overdueCount > 1 ? "s" : ""} en retard
        </p>
        <button
          onClick={handleClose}
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
