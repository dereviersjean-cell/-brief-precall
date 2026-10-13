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
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/ui-bits";
import TaskEmailModal from "./TaskEmailModal";

type GroupedTasks = {
  overdue: TaskListItem[];
  today: TaskListItem[];
  this_week: TaskListItem[];
  later: TaskListItem[];
};

const GROUP_META: { key: keyof GroupedTasks; label: string; dotColor: string; textColor: string }[] = [
  { key: "overdue", label: "En retard", dotColor: "bg-[color:var(--danger)]", textColor: "text-rose-700" },
  { key: "today", label: "Aujourd'hui", dotColor: "bg-[color:var(--violet)]", textColor: "text-[color:var(--violet)]" },
  { key: "this_week", label: "Cette semaine", dotColor: "bg-[color:var(--violet)]/40", textColor: "text-slate-700" },
  { key: "later", label: "Plus tard", dotColor: "bg-slate-400", textColor: "text-slate-500" },
];

const SOURCE_META: Record<string, { label: string; icon: typeof Phone; bg: string; text: string }> = {
  call: { label: "Après call", icon: Phone, bg: "bg-[color:var(--lavender)]", text: "text-[color:var(--violet)]" },
  email: { label: "Après email", icon: Mail, bg: "bg-[color:var(--success-soft)]", text: "text-emerald-700" },
  quote: { label: "Après devis", icon: FileText, bg: "bg-[color:var(--warning-soft)]", text: "text-amber-700" },
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
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-slate-300 sm:flex-nowrap sm:gap-4">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
        <SourceIcon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[14px] font-semibold text-slate-900">{task.title}</p>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-600">
            {meta.label}
          </span>
        </div>
        {task.description && <p className="mb-1.5 text-[13px] leading-relaxed text-slate-500">{task.description}</p>}
        <p className="text-[12px] text-slate-500">
          {formatContactDisplayName(task.contact_name, task.contact_email)} · {formatDueDate(task.due_at)}
        </p>
      </div>
      <div className="flex basis-full items-center justify-end gap-3 sm:basis-auto sm:shrink-0 sm:flex-col sm:items-end sm:gap-2">
        {task.action_type === "open_gmail_draft" ? (
          <Button variant="primary" size="sm" icon={<Mail className="w-3.5 h-3.5" />} onClick={() => onOpenDraft(task)} className="whitespace-nowrap">
            Rédiger l&apos;email
          </Button>
        ) : (
          <Button variant="primary" size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onComplete(task)} className="whitespace-nowrap">
            Marquer comme fait
          </Button>
        )}
        <button onClick={() => onDismiss(task)} className="text-[12px] font-medium text-slate-500 transition-colors hover:text-rose-700">
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="mb-6">
          <PageHeader
            eyebrow="Suivi automatique"
            title={
              <>
                Tasks <span className="italic-serif text-[color:var(--violet)]">de suivi</span>
              </>
            }
            subtitle="Suivi automatique de vos actions après calls, emails et devis."
            actions={
              <Link
                href="/tasks/settings"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium bg-white border border-border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Link>
            }
          />
        </div>
      </FadeIn>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatTile index={0} accent="indigo" label="À faire" value={totalPending} icon={<ListChecks className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="rose" label="En retard" value={grouped.overdue.length} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        <StatTile index={2} accent="violet" label="Aujourd'hui" value={grouped.today.length} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
      </div>

      {/* Tabs */}
      <div className="mb-5 inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
        <button
          onClick={() => setTab("pending")}
          className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
            tab === "pending" ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          À faire
        </button>
        <button
          onClick={handleSwitchToHistory}
          className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
            tab === "history" ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Historique
        </button>
      </div>

      {tab === "pending" ? (
        totalPending === 0 ? (
          <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--success-soft)]">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-semibold text-slate-900">Aucune task en attente</p>
            <p className="mt-1 text-[13.5px] text-slate-500">Vous êtes à jour.</p>
          </div>
        ) : (
          <FadeIn delay={0.1}>
            <div className="space-y-7">
              {GROUP_META.map((meta) => {
                const list = grouped[meta.key];
                if (list.length === 0) return null;
                return (
                  <div key={meta.key}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotColor}`} />
                      <h2 className={`text-[11px] font-semibold uppercase tracking-[0.07em] ${meta.textColor}`}>{meta.label}</h2>
                      <span className="text-[11.5px] tabular-nums text-slate-400">({list.length})</span>
                      <div className="h-px flex-1 bg-border" />
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
        <div className="flex items-center justify-center py-16 text-[13px] text-slate-500">Chargement…</div>
      ) : history && history.length > 0 ? (
        <div className="space-y-2">
          {history.map((task) => {
            const meta = sourceMeta(task.source_type);
            const SourceIcon = meta.icon;
            return (
              <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-border bg-white p-4 opacity-70 sm:gap-4">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
                  <SourceIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-[14px] font-medium text-slate-700 line-through">{task.title}</p>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500">
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500">
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
        <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center text-[13px] text-slate-500">
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
