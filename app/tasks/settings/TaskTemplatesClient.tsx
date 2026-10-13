"use client";

import { useState } from "react";
import type { TaskTemplate, TaskTriggerType } from "@/lib/db";

const SECTIONS: { trigger_type: TaskTriggerType; title: string; description: string }[] = [
  {
    trigger_type: "post_call",
    title: "Après un rendez-vous",
    description: "Déclenché à la fin d'un call analysé.",
  },
  {
    trigger_type: "email_sent_no_reply",
    title: "Après un email envoyé sans réponse",
    description: "Déclenché si le prospect n'a pas répondu à un email de suivi.",
  },
  {
    trigger_type: "quote_sent_no_reply",
    title: "Après un devis envoyé sans acceptation",
    description: "Déclenché si un devis reste sans réponse du client.",
  },
];

const ACTION_TYPE_OPTIONS = [
  { value: "open_gmail_draft", label: "Ouvrir un brouillon Gmail" },
  { value: "none", label: "Aucune action automatique" },
];

function formatDelay(hours: number): string {
  if (hours === 0) return "immédiatement";
  if (hours < 24) return `après ${hours} heure${hours > 1 ? "s" : ""}`;
  const days = Math.round(hours / 24);
  return `après ${days} jour${days > 1 ? "s" : ""}`;
}

function ActionBadge({ actionType }: { actionType: string }) {
  if (actionType !== "open_gmail_draft") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
      📧 Brouillon email
    </span>
  );
}

function HubSpotBadge({ pushToHubspot }: { pushToHubspot: boolean }) {
  if (!pushToHubspot) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
      🟠 Poussée vers HubSpot
    </span>
  );
}

function TaskTemplateModal({
  triggerType,
  template,
  hubspotConnected,
  onClose,
  onSaved,
}: {
  triggerType: TaskTriggerType;
  template: TaskTemplate | null;
  hubspotConnected: boolean;
  onClose: () => void;
  onSaved: (template: TaskTemplate) => void;
}) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [offsetHours, setOffsetHours] = useState(template ? String(template.offset_hours) : "0");
  const [taskType, setTaskType] = useState(template?.task_type ?? "relance_email");
  const [actionType, setActionType] = useState(template?.action_type ?? "open_gmail_draft");
  const [pushToHubspot, setPushToHubspot] = useState(template?.push_to_hubspot ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const hours = parseInt(offsetHours, 10);
    if (!trimmedTitle || Number.isNaN(hours) || hours < 0) return;

    setLoading(true);
    setError(null);
    try {
      const body = {
        trigger_type: triggerType,
        title: trimmedTitle,
        description: description.trim() || null,
        offset_hours: hours,
        task_type: taskType.trim() || "relance_email",
        action_type: actionType,
        push_to_hubspot: pushToHubspot,
      };

      const res = await fetch(
        template ? `/api/tasks/templates/${template.id}` : "/api/tasks/templates",
        {
          method: template ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }

      if (template) {
        onSaved({ ...template, ...body });
      } else {
        const { id } = (await res.json()) as { id: string };
        onSaved({
          id,
          user_id: "",
          trigger_type: triggerType,
          offset_hours: hours,
          task_type: body.task_type,
          title: trimmedTitle,
          description: body.description,
          action_type: actionType,
          enabled: true,
          push_to_hubspot: pushToHubspot,
          sort_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-md)] sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{template ? "Modifier le template" : "Ajouter un template"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] resize-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Délai (heures)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={offsetHours}
                onChange={(e) => setOffsetHours(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Type de tâche</label>
              <input
                type="text"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                placeholder="relance_email"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
            >
              {ACTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-900">Pousser vers HubSpot</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                {hubspotConnected
                  ? "Chaque task générée par ce template crée aussi une task HubSpot, synchronisée dans les deux sens."
                  : "Connectez HubSpot (Paramètres → CRM) pour activer cette option."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPushToHubspot((v) => !v)}
              disabled={!hubspotConnected}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                pushToHubspot ? "bg-[color:var(--primary)]" : "bg-slate-200"
              }`}
              aria-label={pushToHubspot ? "Désactiver" : "Activer"}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  pushToHubspot ? "translate-x-[18px]" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enregistrement…" : template ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onToggle,
  onEdit,
  onDelete,
}: {
  template: TaskTemplate;
  onToggle: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (template: TaskTemplate) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-nowrap sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-[14px] font-semibold text-slate-900">{template.title}</p>
          <ActionBadge actionType={template.action_type} />
          <HubSpotBadge pushToHubspot={template.push_to_hubspot} />
        </div>
        {template.description && <p className="mb-1.5 text-[13px] leading-relaxed text-slate-500">{template.description}</p>}
        <p className="text-[12px] text-slate-500">{formatDelay(template.offset_hours)}</p>
      </div>
      <div className="flex basis-full items-center justify-end gap-3 sm:basis-auto sm:shrink-0">
        <button
          onClick={() => onToggle(template)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            template.enabled ? "bg-[color:var(--primary)]" : "bg-slate-200"
          }`}
          aria-label={template.enabled ? "Désactiver" : "Activer"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              template.enabled ? "translate-x-[18px]" : "translate-x-1"
            }`}
          />
        </button>
        <button onClick={() => onEdit(template)} className="rounded-md px-2 py-1 text-[12px] font-medium text-[color:var(--violet)] transition-colors hover:bg-[color:var(--lavender)]">
          Modifier
        </button>
        <button onClick={() => onDelete(template)} className="rounded-md px-2 py-1 text-[12px] font-medium text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)]">
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default function TaskTemplatesClient({
  initialTemplates,
  hubspotConnected,
  initialImportHubspotTasks,
}: {
  initialTemplates: TaskTemplate[];
  hubspotConnected: boolean;
  initialImportHubspotTasks: boolean;
}) {
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates);
  const [modalState, setModalState] = useState<{ triggerType: TaskTriggerType; template: TaskTemplate | null } | null>(
    null
  );
  const [importHubspotTasks, setImportHubspotTasks] = useState(initialImportHubspotTasks);
  const [importSaving, setImportSaving] = useState(false);

  async function handleToggleImport() {
    const next = !importHubspotTasks;
    setImportHubspotTasks(next);
    setImportSaving(true);
    try {
      const res = await fetch("/api/tasks/import-hubspot-setting", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setImportHubspotTasks(!next);
    } finally {
      setImportSaving(false);
    }
  }

  async function handleToggle(template: TaskTemplate) {
    const nextEnabled = !template.enabled;
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, enabled: nextEnabled } : t)));
    try {
      const res = await fetch(`/api/tasks/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, enabled: template.enabled } : t)));
    }
  }

  async function handleDelete(template: TaskTemplate) {
    if (!window.confirm(`Supprimer le template "${template.title}" ?`)) return;
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    try {
      const res = await fetch(`/api/tasks/templates/${template.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates((prev) => [...prev, template]);
    }
  }

  function handleSaved(saved: TaskTemplate) {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      const next = exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
      return next.sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    });
    setModalState(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Paramètres des tasks</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            Règles automatiques déclenchant des tasks de suivi selon les échanges avec vos prospects.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900">Importer les tasks HubSpot</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">
              {hubspotConnected
                ? "Toute task créée nativement dans HubSpot (assignée à vous) est aussi créée sur Brief, synchronisée dans les deux sens."
                : "Connectez HubSpot (Paramètres → CRM) pour activer cette option."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleImport}
            disabled={!hubspotConnected || importSaving}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              importHubspotTasks ? "bg-[color:var(--primary)]" : "bg-slate-200"
            }`}
            aria-label={importHubspotTasks ? "Désactiver" : "Activer"}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                importHubspotTasks ? "translate-x-[18px]" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-9">
          {SECTIONS.map((section) => {
            const sectionTemplates = templates.filter((t) => t.trigger_type === section.trigger_type);
            return (
              <div key={section.trigger_type}>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{section.title}</h2>
                    <p className="mt-1 text-[12.5px] text-slate-500">{section.description}</p>
                  </div>
                  <button
                    onClick={() => setModalState({ triggerType: section.trigger_type, template: null })}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3 text-[12px] font-medium text-white transition-all hover:brightness-110"
                  >
                    + Ajouter un template
                  </button>
                </div>

                {sectionTemplates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-[13px] text-slate-500">
                    Aucun template dans cette section.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onToggle={handleToggle}
                        onEdit={(t) => setModalState({ triggerType: t.trigger_type, template: t })}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modalState && (
        <TaskTemplateModal
          triggerType={modalState.triggerType}
          template={modalState.template}
          hubspotConnected={hubspotConnected}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
