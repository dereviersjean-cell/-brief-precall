"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TaskListItem } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import TaskEmailModal from "./TaskEmailModal";

type GroupedTasks = {
  overdue: TaskListItem[];
  today: TaskListItem[];
  this_week: TaskListItem[];
  later: TaskListItem[];
};

const GROUP_META: { key: keyof GroupedTasks; label: string; dotColor: string; textColor: string }[] = [
  { key: "overdue", label: "En retard", dotColor: "bg-red-500", textColor: "text-red-700" },
  { key: "today", label: "Aujourd'hui", dotColor: "bg-indigo-500", textColor: "text-indigo-700" },
  { key: "this_week", label: "Cette semaine", dotColor: "bg-blue-500", textColor: "text-blue-700" },
  { key: "later", label: "Plus tard", dotColor: "bg-slate-400", textColor: "text-slate-500" },
];

const SOURCE_LABELS: Record<string, string> = {
  call: "Après call",
  email: "Après email",
  quote: "Après devis",
};

function formatDueDate(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) return `En retard de ${overdueHours} h`;
    const overdueDays = Math.round(overdueHours / 24);
    return `En retard de ${overdueDays} j`;
  }

  if (diffHours < 1) return "Maintenant";
  if (diffHours < 24) return `Dans ${diffHours} h`;

  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.round((dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const timeStr = due.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (dayDiff === 1) return `Demain à ${timeStr}`;
  if (dayDiff <= 7) return due.toLocaleDateString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  return due.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TaskCard({
  task,
  onComplete,
  onDismiss,
  onOpenDraft,
}: {
  task: TaskListItem;
  onComplete: (task: TaskListItem) => void;
  onDismiss: (task: TaskListItem) => void;
  onOpenDraft: (task: TaskListItem) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-slate-900">{task.title}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {SOURCE_LABELS[task.source_type] ?? task.source_type}
          </span>
        </div>
        {task.description && <p className="text-sm text-slate-500 mb-1.5">{task.description}</p>}
        <p className="text-xs text-slate-400">
          {formatContactDisplayName(task.contact_name, task.contact_email)} · {formatDueDate(task.due_at)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {task.action_type === "open_gmail_draft" ? (
          <button
            onClick={() => onOpenDraft(task)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            📧 Rédiger l&apos;email
          </button>
        ) : (
          <button
            onClick={() => onComplete(task)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            ✓ Marquer comme fait
          </button>
        )}
        <button onClick={() => onDismiss(task)} className="text-xs text-slate-400 hover:text-red-600 transition-colors">
          Rejeter
        </button>
      </div>
    </div>
  );
}

export default function TasksListClient({ initialGrouped }: { initialGrouped: GroupedTasks }) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [grouped, setGrouped] = useState<GroupedTasks>(initialGrouped);
  const [history, setHistory] = useState<TaskListItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [emailModalTask, setEmailModalTask] = useState<TaskListItem | null>(null);

  function removeTaskFromGrouped(taskId: string) {
    setGrouped((prev) => ({
      overdue: prev.overdue.filter((t) => t.id !== taskId),
      today: prev.today.filter((t) => t.id !== taskId),
      this_week: prev.this_week.filter((t) => t.id !== taskId),
      later: prev.later.filter((t) => t.id !== taskId),
    }));
  }

  async function handleComplete(task: TaskListItem) {
    removeTaskFromGrouped(task.id);
    try {
      await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
    } catch {
      // Best-effort — worst case the card disappears without persisting and
      // reappears on next reload; not worth a rollback for this action.
    }
  }

  async function handleDismiss(task: TaskListItem) {
    removeTaskFromGrouped(task.id);
    try {
      await fetch(`/api/tasks/${task.id}/dismiss`, { method: "POST" });
    } catch {
      // same trade-off as handleComplete
    }
  }

  function handleEmailSent() {
    if (emailModalTask) {
      removeTaskFromGrouped(emailModalTask.id);
    }
    setEmailModalTask(null);
    router.refresh();
  }

  async function handleSwitchToHistory() {
    setTab("history");
    if (history !== null) return;
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/tasks?filter=completed");
      const data = (await res.json()) as TaskListItem[];
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  const totalPending =
    grouped.overdue.length + grouped.today.length + grouped.this_week.length + grouped.later.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Suivi automatique de vos actions après calls, emails et devis.
            </p>
          </div>
          <Link
            href="/tasks/settings"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ⚙️ Paramètres
          </Link>
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "pending"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            À faire
          </button>
          <button
            onClick={handleSwitchToHistory}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "history"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Historique
          </button>
        </div>

        {tab === "pending" ? (
          totalPending === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-lg font-medium text-slate-700">🎉 Aucune task en attente — vous êtes à jour</p>
            </div>
          ) : (
            <div className="space-y-8">
              {GROUP_META.map((meta) => {
                const list = grouped[meta.key];
                if (list.length === 0) return null;
                return (
                  <div key={meta.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                      <h2 className={`text-sm font-semibold ${meta.textColor}`}>{meta.label}</h2>
                      <span className="text-xs text-slate-400">({list.length})</span>
                    </div>
                    <div className="space-y-2">
                      {list.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onDismiss={handleDismiss}
                          onOpenDraft={setEmailModalTask}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : historyLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Chargement…</div>
        ) : history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((task) => (
              <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-70">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-medium text-slate-700 line-through">{task.title}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                    {SOURCE_LABELS[task.source_type] ?? task.source_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {formatContactDisplayName(task.contact_name, task.contact_email)} · Fait le{" "}
                  {task.completed_at
                    ? new Date(task.completed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            Aucune task complétée pour l&apos;instant.
          </div>
        )}
      </div>

      {emailModalTask && (
        <TaskEmailModal
          taskId={emailModalTask.id}
          taskTitle={emailModalTask.title}
          taskType={emailModalTask.task_type}
          contactEmail={emailModalTask.contact_email ?? ""}
          onClose={() => setEmailModalTask(null)}
          onSent={handleEmailSent}
        />
      )}
    </div>
  );
}
