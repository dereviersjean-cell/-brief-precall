"use client";

import { useState } from "react";
import { Pencil, Check, X, ArrowUp, ArrowDown, Plus, Trash2, Upload, BookOpen, Layers, ListChecks, Gauge } from "lucide-react";
import type { Playbook, PlaybookDimension } from "@/lib/db";
import type { MeetingStageConfig } from "@/lib/meeting-stage";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import ImportPlaybookModal from "./ImportPlaybookModal";
import MeetingStagesSection from "./MeetingStagesSection";

function PlaybookNameEditor({ name, onSave, readOnly }: { name: string; onSave: (next: string) => void; readOnly: boolean }) {
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
      <div className="mt-1.5 flex min-w-0 items-center gap-2">
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
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-2.5 py-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20"
        />
        <button
          onClick={commit}
          disabled={saving}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--primary)] text-white transition-all hover:brightness-110 disabled:opacity-50"
          aria-label="Enregistrer"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label="Annuler"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <h1 className="min-w-0 break-words text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">{name}</h1>
      {!readOnly && (
      <button
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Modifier le nom"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      )}
    </div>
  );
}

function InlineText({
  value,
  onSave,
  className,
  placeholder,
  readOnly = false,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
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
        className={`w-full rounded-lg border border-border bg-white px-1.5 py-0.5 focus:border-[color:var(--violet)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20 ${className ?? ""}`}
      />
    );
  }

  if (readOnly) {
    return (
      <p className={`px-1.5 -mx-1.5 py-0.5 ${className ?? ""}`}>
        {value || <span className="text-slate-400">{placeholder}</span>}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`-mx-1.5 w-full rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-slate-50 ${className ?? ""}`}
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
  readOnly,
}: {
  dimension: PlaybookDimension;
  index: number;
  total: number;
  readOnly: boolean;
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
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <InlineText
            value={dimension.label}
            onSave={(v) => onUpdate({ label: v })}
            className="text-[14.5px] font-semibold text-slate-900"
            readOnly={readOnly}
          />
        </div>
        <span className="mt-1 shrink-0 font-mono text-[11px] text-slate-500">{dimension.key}</span>
      </div>

      <div className="mt-0.5">
        <InlineText
          value={dimension.description ?? ""}
          onSave={(v) => onUpdate({ description: v })}
          className="text-[12.5px] leading-relaxed text-slate-500"
          placeholder="Ajouter une description…"
          readOnly={readOnly}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
        <label className="flex items-center gap-2 text-[12px] text-slate-500">
          Poids
          {readOnly ? (
            <span className="grid h-7 w-10 place-items-center rounded-lg border border-border text-[13px] font-semibold tabular-nums text-slate-900">{dimension.weight}</span>
          ) : (
            <input
              type="number"
              min={1}
              value={dimension.weight}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v > 0) onUpdate({ weight: v });
              }}
              className="h-7 w-14 rounded-lg border border-border bg-white px-2 text-center text-[13px] font-semibold tabular-nums text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20"
            />
          )}
        </label>
        {!readOnly && (
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Monter"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Descendre"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            disabled={isLast}
            className="ml-1 flex h-7 items-center gap-1 rounded-lg border border-[color:var(--danger-soft)] bg-white px-2.5 text-[12px] font-medium text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-30"
            title={isLast ? "Dernière dimension — suppression impossible" : "Supprimer la dimension"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {dimension.criteria.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <InlineText
                value={c.question}
                onSave={(v) => onUpdateCriterion(c.id, v)}
                className="text-[13px] text-slate-900"
                readOnly={readOnly}
              />
            </div>
            {!readOnly && (
              <button
                onClick={() => onDeleteCriterion(c.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-[color:var(--danger-soft)] hover:text-rose-700"
                aria-label="Supprimer la question"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {dimension.criteria.length === 0 && <p className="text-[13px] text-slate-400">Aucune question pour cette dimension.</p>}
      </div>

      {!readOnly && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = newQuestion.trim();
          if (!trimmed) return;
          onAddCriterion(trimmed);
          setNewQuestion("");
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Ajouter une question…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
        />
        <button
          type="submit"
          disabled={!newQuestion.trim()}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3 text-[12.5px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une question
        </button>
      </form>
      )}
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
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">Ajouter une dimension</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Label</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex. Vision produit"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-700">Poids</label>
            <input
              type="number"
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-20 rounded-xl border border-border bg-white px-3 py-2 text-[13px] font-semibold tabular-nums text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!label.trim() || loading}
            className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// `readOnly` : depuis le 29/07/2026 le Playbook est un onglet de Performance
// et non plus une page d'Équipe — les commerciaux y accèdent en lecture (c'est
// la grille sur laquelle ils sont notés, la leur cacher n'avait pas de sens),
// les managers seuls l'éditent. Purement visuel : les routes /api/playbook/*
// relisent le rôle en base, un appel direct ne contourne rien.
export default function PlaybookClient({
  playbook: initialPlaybook,
  meetingStageConfig,
  readOnly = false,
}: {
  playbook: Playbook;
  meetingStageConfig: MeetingStageConfig;
  readOnly?: boolean;
}) {
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
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
              <BookOpen className="h-3.5 w-3.5" />
              Playbook coaching
            </span>
            <PlaybookNameEditor name={playbook.name} onSave={handleSaveName} readOnly={readOnly} />
            <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
              {readOnly
                ? "La grille sur laquelle vos rendez-vous sont notés. Seul votre manager peut la modifier."
                : "Ce playbook s'applique à tous les rendez-vous de votre organisation."}
            </p>
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Upload className="h-4 w-4" />
            Importer depuis un doc
          </button>
          )}
        </div>
      </FadeIn>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile index={0} accent="indigo" label="Dimensions" value={playbook.dimensions.length} icon={<Layers className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Questions au total" value={totalQuestions} icon={<ListChecks className="w-3.5 h-3.5" />} />
        <StatTile index={2} accent="amber" label="Poids total" value={totalWeight} icon={<Gauge className="w-3.5 h-3.5" />} />
      </div>

      <FadeIn delay={0.1}>
        <div className="space-y-3">
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
              readOnly={readOnly}
            />
          ))}
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-4 py-2.5 text-[12.5px] font-medium text-slate-600 transition-colors hover:border-[color:var(--violet)] hover:text-[color:var(--violet)]"
          >
            <Plus className="w-4 h-4" />
            Ajouter une dimension
          </button>
        )}
      </FadeIn>

      {showAddModal && <AddDimensionModal onClose={() => setShowAddModal(false)} onCreate={handleAddDimension} />}
      {showImportModal && <ImportPlaybookModal onClose={() => setShowImportModal(false)} />}

      <MeetingStagesSection initialConfig={meetingStageConfig} readOnly={readOnly} />
    </div>
  );
}
