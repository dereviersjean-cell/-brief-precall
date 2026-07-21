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
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--lavender)] text-[color:var(--violet)]">
      📧 Brouillon email
    </span>
  );
}

function HubSpotBadge({ pushToHubspot }: { pushToHubspot: boolean }) {
  if (!pushToHubspot) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">{template ? "Modifier le template" : "Ajouter un template"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Délai (heures)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={offsetHours}
                onChange={(e) => setOffsetHours(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type de tâche</label>
              <input
                type="text"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                placeholder="relance_email"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
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
              <p className="text-sm font-medium text-slate-700">Pousser vers HubSpot</p>
              <p className="text-xs text-slate-400 mt-0.5">
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
                pushToHubspot ? "bg-orange-500" : "bg-slate-200"
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

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || loading}
            className="text-sm font-medium text-white brand-gradient px-4 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
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
    <div className="bg-white rounded-xl border border-border p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-slate-900">{template.title}</p>
          <ActionBadge actionType={template.action_type} />
          <HubSpotBadge pushToHubspot={template.push_to_hubspot} />
        </div>
        {template.description && <p className="text-sm text-slate-500 mb-1.5">{template.description}</p>}
        <p className="text-xs text-slate-400">{formatDelay(template.offset_hours)}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onToggle(template)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            template.enabled ? "brand-gradient" : "bg-slate-200"
          }`}
          aria-label={template.enabled ? "Désactiver" : "Activer"}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              template.enabled ? "translate-x-[18px]" : "translate-x-1"
            }`}
          />
        </button>
        <button onClick={() => onEdit(template)} className="text-xs font-medium text-[color:var(--violet)] hover:text-[color:var(--violet)]">
          Modifier
        </button>
        <button onClick={() => onDelete(template)} className="text-xs font-medium text-red-600 hover:text-red-700">
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Paramètres des tasks</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Règles automatiques déclenchant des tasks de suivi selon les échanges avec vos prospects.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 flex items-center justify-between gap-4 mb-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700">Importer les tasks HubSpot</p>
            <p className="text-xs text-slate-400 mt-0.5">
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
              importHubspotTasks ? "bg-orange-500" : "bg-slate-200"
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

        <div className="space-y-8">
          {SECTIONS.map((section) => {
            const sectionTemplates = templates.filter((t) => t.trigger_type === section.trigger_type);
            return (
              <div key={section.trigger_type}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                  </div>
                  <button
                    onClick={() => setModalState({ triggerType: section.trigger_type, template: null })}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 brand-gradient text-white rounded-lg text-xs font-medium hover:brightness-110 transition-colors"
                  >
                    + Ajouter un template
                  </button>
                </div>

                {sectionTemplates.length === 0 ? (
                  <div className="bg-white rounded-xl border border-border p-6 text-center text-sm text-slate-400">
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
