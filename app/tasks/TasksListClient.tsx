"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  Check,
} from "lucide-react";
import type { TaskListItem } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
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

const SOURCE_META: Record<string, { label: string; icon: typeof Phone; bg: string; text: string }> = {
  call: { label: "Après call", icon: Phone, bg: "bg-indigo-50", text: "text-indigo-500" },
  email: { label: "Après email", icon: Mail, bg: "bg-emerald-50", text: "text-emerald-500" },
  quote: { label: "Après devis", icon: FileText, bg: "bg-amber-50", text: "text-amber-500" },
};

function sourceMeta(sourceType: string) {
  return SOURCE_META[sourceType] ?? { label: sourceType, icon: ListChecks, bg: "bg-slate-100", text: "text-slate-500" };
}

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
  const meta = sourceMeta(task.source_type);
  const SourceIcon = meta.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-md hover:border-indigo-200 transition-all">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
        <SourceIcon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-slate-900">{task.title}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {meta.label}
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            Rédiger l&apos;email
          </button>
        ) : (
          <button
            onClick={() => onComplete(task)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Marquer comme fait
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-red-100/30 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
                <ListChecks className="w-3 h-3" />
                Suivi automatique
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
              <p className="text-slate-500 text-sm mt-1">
                Suivi automatique de vos actions après calls, emails et devis.
              </p>
            </div>
            <Link
              href="/tasks/settings"
              className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 shrink-0"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile index={0} accent="indigo" label="À faire" value={totalPending} icon={<ListChecks className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="rose" label="En retard" value={grouped.overdue.length} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <StatTile index={2} accent="violet" label="Aujourd'hui" value={grouped.today.length} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-5">
        <button
          onClick={() => setTab("pending")}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
            tab === "pending" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          À faire
        </button>
        <button
          onClick={handleSwitchToHistory}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
            tab === "history" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Historique
        </button>
      </div>

      {tab === "pending" ? (
        totalPending === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
            </div>
            <p className="text-slate-700 font-medium">Aucune task en attente</p>
            <p className="text-slate-400 text-sm mt-1">Vous êtes à jour.</p>
          </div>
        ) : (
          <FadeIn delay={0.1}>
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
          </FadeIn>
        )
      ) : historyLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Chargement…</div>
      ) : history && history.length > 0 ? (
        <div className="space-y-2">
          {history.map((task) => {
            const meta = sourceMeta(task.source_type);
            const SourceIcon = meta.icon;
            return (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4 opacity-70">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
                  <SourceIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-slate-700 line-through">{task.title}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatContactDisplayName(task.contact_name, task.contact_email)} · Fait le{" "}
                    {task.completed_at
                      ? new Date(task.completed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Aucune task complétée pour l&apos;instant.
        </div>
      )}

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
