"use client";

import { useState } from "react";
import { Pencil, Check, X, ArrowUp, ArrowDown, Plus, Trash2, Upload, BookOpen, Layers, ListChecks, Gauge } from "lucide-react";
import type { Playbook, PlaybookDimension } from "@/lib/db";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import ImportPlaybookModal from "./ImportPlaybookModal";

function PlaybookNameEditor({ name, onSave }: { name: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="text-2xl font-bold text-slate-900 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
        />
        <button
          onClick={commit}
          disabled={saving}
          className="h-8 w-8 flex items-center justify-center rounded-lg brand-gradient text-white hover:brightness-110 transition-colors duration-200 disabled:opacity-50"
          aria-label="Enregistrer"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors duration-200"
          aria-label="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
      <button
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors duration-200"
        aria-label="Modifier le nom"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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
        className={`w-full border border-slate-300 rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)] ${className ?? ""}`}
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
      className={`text-left w-full hover:bg-slate-50 rounded-lg px-1.5 -mx-1.5 py-0.5 transition-colors duration-200 ${className ?? ""}`}
    >
      {value || <span className="text-slate-400">{placeholder}</span>}
    </button>
  );
}

function DimensionCard({
  dimension,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onAddCriterion,
  onUpdateCriterion,
  onDeleteCriterion,
}: {
  dimension: PlaybookDimension;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Pick<PlaybookDimension, "label" | "description" | "weight">>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
  onAddCriterion: (question: string) => void;
  onUpdateCriterion: (criterionId: string, question: string) => void;
  onDeleteCriterion: (criterionId: string) => void;
}) {
  const [newQuestion, setNewQuestion] = useState("");
  const isLast = total <= 1;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <InlineText
            value={dimension.label}
            onSave={(v) => onUpdate({ label: v })}
            className="font-semibold text-slate-900"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono shrink-0 mt-1">{dimension.key}</span>
      </div>

      <div className="mt-1">
        <InlineText
          value={dimension.description ?? ""}
          onSave={(v) => onUpdate({ description: v })}
          className="text-sm text-slate-500"
          placeholder="Ajouter une description…"
        />
      </div>

      <div className="flex items-center gap-4 mt-4 pb-4 border-b border-slate-100">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Poids
          <input
            type="number"
            min={1}
            value={dimension.weight}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v > 0) onUpdate({ weight: v });
            }}
            className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
          />
        </label>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Monter"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Descendre"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={isLast}
            className="h-7 px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 ml-1"
            title={isLast ? "Dernière dimension — suppression impossible" : "Supprimer la dimension"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="space-y-1.5 mt-4">
        {dimension.criteria.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <InlineText
                value={c.question}
                onSave={(v) => onUpdateCriterion(c.id, v)}
                className="text-sm text-slate-700"
              />
            </div>
            <button
              onClick={() => onDeleteCriterion(c.id)}
              className="shrink-0 h-6 w-6 flex items-center justify-center text-slate-300 hover:text-red-600 transition-colors duration-200"
              aria-label="Supprimer la question"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {dimension.criteria.length === 0 && <p className="text-sm text-slate-400">Aucune question pour cette dimension.</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newQuestion.trim();
          if (!trimmed) return;
          onAddCriterion(trimmed);
          setNewQuestion("");
        }}
        className="flex items-center gap-2 mt-3"
      >
        <input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Ajouter une question…"
          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
        />
        <button
          type="submit"
          disabled={!newQuestion.trim()}
          className="h-8 px-3 flex items-center gap-1.5 rounded-lg brand-gradient text-white text-sm font-medium hover:brightness-110 transition-colors duration-200 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une question
        </button>
      </form>
    </div>
  );
}

function AddDimensionModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { label: string; description: string; weight: number }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("1");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = label.trim();
    const w = parseInt(weight, 10);
    if (!trimmed || Number.isNaN(w) || w < 1) return;
    setLoading(true);
    await onCreate({ label: trimmed, description: description.trim(), weight: w });
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-slate-900 mb-4">Ajouter une dimension</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Vision produit"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Poids</label>
            <input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-8 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!label.trim() || loading}
            className="h-8 px-4 text-sm font-medium text-white brand-gradient rounded-lg hover:brightness-110 transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlaybookClient({ playbook: initialPlaybook }: { playbook: Playbook }) {
  const [playbook, setPlaybook] = useState(initialPlaybook);
  // useState(initialPlaybook) only reads its argument on mount — after the
  // import modal calls router.refresh(), the parent server component
  // re-fetches and passes a fresh `playbook` prop, but without re-syncing
  // here the state above would never pick it up (this component isn't
  // remounted), so the page kept showing the pre-import dimensions even
  // though the replace had already succeeded in the database. Adjusting
  // state during render (React's documented pattern for this — see
  // "Adjusting some state when a prop changes" on react.dev) instead of in
  // a useEffect avoids an extra render and the set-state-in-effect lint rule.
  const [syncedFrom, setSyncedFrom] = useState(initialPlaybook);
  if (initialPlaybook !== syncedFrom) {
    setSyncedFrom(initialPlaybook);
    setPlaybook(initialPlaybook);
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  async function handleSaveName(name: string) {
    const prev = playbook.name;
    setPlaybook((p) => ({ ...p, name }));
    try {
      const res = await fetch("/api/playbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook((p) => ({ ...p, name: prev }));
    }
  }

  async function handleUpdateDimension(
    dimensionId: string,
    patch: Partial<Pick<PlaybookDimension, "label" | "description" | "weight">>
  ) {
    const prev = playbook;
    setPlaybook((p) => ({
      ...p,
      dimensions: p.dimensions.map((d) => (d.id === dimensionId ? { ...d, ...patch } : d)),
    }));
    try {
      const res = await fetch(`/api/playbook/dimensions/${dimensionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook(prev);
    }
  }

  async function handleDeleteDimension(dimensionId: string) {
    if (playbook.dimensions.length <= 1) return;
    if (!window.confirm("Supprimer cette dimension et toutes ses questions ?")) return;
    const prev = playbook;
    setPlaybook((p) => ({ ...p, dimensions: p.dimensions.filter((d) => d.id !== dimensionId) }));
    try {
      const res = await fetch(`/api/playbook/dimensions/${dimensionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook(prev);
    }
  }

  async function handleMoveDimension(dimensionId: string, direction: "up" | "down") {
    const index = playbook.dimensions.findIndex((d) => d.id === dimensionId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= playbook.dimensions.length) return;

    const prev = playbook;
    const next = [...playbook.dimensions];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setPlaybook((p) => ({ ...p, dimensions: next }));

    try {
      const res = await fetch("/api/playbook/dimensions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((d) => d.id) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook(prev);
    }
  }

  async function handleAddDimension(data: { label: string; description: string; weight: number }) {
    try {
      const res = await fetch("/api/playbook/dimensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      setPlaybook((p) => ({
        ...p,
        dimensions: [
          ...p.dimensions,
          {
            id,
            playbook_id: p.id,
            key: data.label
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "") || "dimension",
            label: data.label,
            description: data.description || null,
            weight: data.weight,
            sort_order: p.dimensions.length,
            created_at: new Date().toISOString(),
            criteria: [],
          },
        ],
      }));
      setShowAddModal(false);
    } catch {
      window.alert("Erreur lors de la création de la dimension.");
    }
  }

  async function handleAddCriterion(dimensionId: string, question: string) {
    try {
      const res = await fetch("/api/playbook/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensionId, question }),
      });
      if (!res.ok) throw new Error();
      const { id } = (await res.json()) as { id: string };
      setPlaybook((p) => ({
        ...p,
        dimensions: p.dimensions.map((d) =>
          d.id === dimensionId
            ? {
                ...d,
                criteria: [
                  ...d.criteria,
                  { id, dimension_id: dimensionId, question, sort_order: d.criteria.length, created_at: new Date().toISOString() },
                ],
              }
            : d
        ),
      }));
    } catch {
      window.alert("Erreur lors de l'ajout de la question.");
    }
  }

  async function handleUpdateCriterion(dimensionId: string, criterionId: string, question: string) {
    const prev = playbook;
    setPlaybook((p) => ({
      ...p,
      dimensions: p.dimensions.map((d) =>
        d.id === dimensionId
          ? { ...d, criteria: d.criteria.map((c) => (c.id === criterionId ? { ...c, question } : c)) }
          : d
      ),
    }));
    try {
      const res = await fetch(`/api/playbook/criteria/${criterionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook(prev);
    }
  }

  async function handleDeleteCriterion(dimensionId: string, criterionId: string) {
    const prev = playbook;
    setPlaybook((p) => ({
      ...p,
      dimensions: p.dimensions.map((d) =>
        d.id === dimensionId ? { ...d, criteria: d.criteria.filter((c) => c.id !== criterionId) } : d
      ),
    }));
    try {
      const res = await fetch(`/api/playbook/criteria/${criterionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setPlaybook(prev);
    }
  }

  const totalQuestions = playbook.dimensions.reduce((n, d) => n + d.criteria.length, 0);
  const totalWeight = playbook.dimensions.reduce((n, d) => n + d.weight, 0);

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
                <BookOpen className="w-3 h-3" />
                Playbook coaching
              </span>
              <PlaybookNameEditor name={playbook.name} onSave={handleSaveName} />
              <p className="text-slate-500 text-sm mt-1">
                Ce playbook s&apos;applique à tous les rendez-vous de votre organisation.
              </p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200"
            >
              <Upload className="w-4 h-4" />
              Importer depuis un doc
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile index={0} accent="indigo" label="Dimensions" value={playbook.dimensions.length} icon={<Layers className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Questions au total" value={totalQuestions} icon={<ListChecks className="w-3.5 h-3.5" />} />
        <StatTile index={2} accent="amber" label="Poids total" value={totalWeight} icon={<Gauge className="w-3.5 h-3.5" />} />
      </div>

      <FadeIn delay={0.1}>
        <div className="space-y-4">
          {playbook.dimensions.map((dimension, index) => (
            <DimensionCard
              key={dimension.id}
              dimension={dimension}
              index={index}
              total={playbook.dimensions.length}
              onUpdate={(patch) => handleUpdateDimension(dimension.id, patch)}
              onDelete={() => handleDeleteDimension(dimension.id)}
              onMove={(direction) => handleMoveDimension(dimension.id, direction)}
              onAddCriterion={(q) => handleAddCriterion(dimension.id, q)}
              onUpdateCriterion={(criterionId, q) => handleUpdateCriterion(dimension.id, criterionId, q)}
              onDeleteCriterion={(criterionId) => handleDeleteCriterion(dimension.id, criterionId)}
            />
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200"
        >
          <Plus className="w-4 h-4" />
          Ajouter une dimension
        </button>
      </FadeIn>

      {showAddModal && <AddDimensionModal onClose={() => setShowAddModal(false)} onCreate={handleAddDimension} />}
      {showImportModal && <ImportPlaybookModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
