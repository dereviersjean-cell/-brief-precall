"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import type { EmailTemplate } from "@/lib/db";

function InlineText({
  value,
  onSave,
  className,
  placeholder,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`w-full border border-gray-300 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`text-left w-full hover:bg-gray-50 rounded-md px-1.5 -mx-1.5 py-0.5 transition-colors duration-200 ${className ?? ""}`}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </button>
  );
}

function TemplateCard({
  template,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
}: {
  template: EmailTemplate;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Pick<EmailTemplate, "name" | "description" | "system_prompt">>) => Promise<void>;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const [promptDraft, setPromptDraft] = useState(template.system_prompt);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const promptDirty = promptDraft !== template.system_prompt;
  const isLast = total <= 1;

  async function handleSavePrompt() {
    setSavingPrompt(true);
    await onUpdate({ system_prompt: promptDraft });
    setSavingPrompt(false);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <InlineText value={template.name} onSave={(v) => onUpdate({ name: v })} className="font-semibold text-gray-900" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Monter"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Descendre"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={isLast}
            className="h-7 px-2.5 flex items-center gap-1 rounded-md border border-gray-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 ml-1"
            title={isLast ? "Dernier template — suppression impossible" : "Supprimer le template"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="mt-1">
        <InlineText
          value={template.description ?? ""}
          onSave={(v) => onUpdate({ description: v })}
          className="text-sm text-gray-500"
          placeholder="Ajouter une description…"
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Prompt utilisé par l&apos;IA
        </label>
        <textarea
          value={promptDraft}
          onChange={(e) => setPromptDraft(e.target.value)}
          rows={12}
          className="w-full px-3.5 py-3 border border-gray-200 rounded-md text-sm text-gray-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          {promptDirty && <span className="text-xs text-amber-600 mr-auto">Modifications non enregistrées</span>}
          <button
            onClick={() => setPromptDraft(template.system_prompt)}
            disabled={!promptDirty}
            className="h-8 px-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={handleSavePrompt}
            disabled={!promptDirty || savingPrompt}
            className="h-8 px-3 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-primary transition-colors duration-200 disabled:opacity-50"
          >
            {savingPrompt ? "Enregistrement…" : "Enregistrer le prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; system_prompt: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedPrompt = systemPrompt.trim();
    if (!trimmedName || !trimmedPrompt) return;
    setLoading(true);
    await onCreate({ name: trimmedName, description: description.trim(), system_prompt: trimmedPrompt });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-gray-900 mb-4">Ajouter un template</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Call 4 — Relance"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prompt système</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="Tu rédiges un email de suivi post-call pour…"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-8 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !systemPrompt.trim() || loading}
            className="h-8 px-4 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-primary transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmailTemplatesClient({ templates: initialTemplates }: { templates: EmailTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [showAddModal, setShowAddModal] = useState(false);

  async function handleUpdateTemplate(
    templateId: string,
    patch: Partial<Pick<EmailTemplate, "name" | "description" | "system_prompt">>
  ) {
    const prev = templates;
    setTemplates((ts) => ts.map((t) => (t.id === templateId ? { ...t, ...patch } : t)));
    try {
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates(prev);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (templates.length <= 1) return;
    if (!window.confirm("Supprimer ce template ?")) return;
    const prev = templates;
    setTemplates((ts) => ts.filter((t) => t.id !== templateId));
    try {
      const res = await fetch(`/api/email-templates/${templateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates(prev);
    }
  }

  async function handleMoveTemplate(templateId: string, direction: "up" | "down") {
    const index = templates.findIndex((t) => t.id === templateId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= templates.length) return;

    const prev = templates;
    const next = [...templates];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setTemplates(next);

    try {
      const res = await fetch("/api/email-templates/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTemplates(prev);
    }
  }

  async function handleAddTemplate(data: { name: string; description: string; system_prompt: string }) {
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      setTemplates((ts) => [
        ...ts,
        {
          id,
          organization_id: "",
          name: data.name,
          description: data.description || null,
          system_prompt: data.system_prompt,
          sort_order: ts.length,
          is_default: false,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setShowAddModal(false);
    } catch {
      window.alert("Erreur lors de la création du template.");
    }
  }

  return (
    <div className="brief-ui min-h-screen bg-white">
      <main className="max-w-3xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Templates d&apos;emails post-call</h1>
          <p className="text-gray-500 text-sm mt-1">
            Ces templates sont utilisés par vos commerciaux pour rédiger leurs emails de suivi. Vous pouvez en créer
            autant que nécessaire.
          </p>
        </div>

        <div className="space-y-4">
          {templates.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              index={index}
              total={templates.length}
              onUpdate={(patch) => handleUpdateTemplate(template.id, patch)}
              onDelete={() => handleDeleteTemplate(template.id)}
              onMove={(direction) => handleMoveTemplate(template.id, direction)}
            />
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un template
        </button>
      </main>

      {showAddModal && <AddTemplateModal onClose={() => setShowAddModal(false)} onCreate={handleAddTemplate} />}
    </div>
  );
}
