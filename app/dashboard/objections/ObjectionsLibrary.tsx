"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, FileUp, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import type { ObjectionCategory } from "@/lib/db";
import ImportObjectionsModal from "./ImportObjectionsModal";

// Bibliothèque d'objections du manager — même double entrée que le Playbook
// (import de document OU saisie manuelle), volontairement : un manager qui a
// déjà un argumentaire écrit importe, un manager qui part de zéro saisit.
//
// Repliée par défaut quand des objections existent déjà : la page sert
// d'abord à LIRE les statistiques, la configuration est secondaire une fois
// faite. Dépliée quand la bibliothèque est vide, où c'est la seule action
// utile de la page.

type Draft = {
  label: string;
  description: string;
  handlingGuidance: string;
  examplePhrasings: string;
};

const EMPTY_DRAFT: Draft = { label: "", description: "", handlingGuidance: "", examplePhrasings: "" };

function draftFrom(category: ObjectionCategory): Draft {
  return {
    label: category.label,
    description: category.description,
    handlingGuidance: category.handlingGuidance,
    examplePhrasings: category.examplePhrasings.join("\n"),
  };
}

function draftToPayload(draft: Draft) {
  return {
    label: draft.label.trim(),
    description: draft.description.trim(),
    handlingGuidance: draft.handlingGuidance.trim(),
    examplePhrasings: draft.examplePhrasings
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean),
  };
}

function CategoryForm({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const inputClass =
    "w-full rounded-lg border border-border px-3 py-2 text-[13px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]";

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nom de l&apos;objection</label>
        <input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Prix trop élevé"
          autoFocus
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Ce qui la caractérise <span className="font-normal text-slate-400">— sert à la reconnaître dans les calls</span>
        </label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={2}
          placeholder="Le prospect trouve le tarif trop haut dans l'absolu ou par rapport à un concurrent."
          className={`${inputClass} resize-y`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Comment la traiter{" "}
          <span className="font-normal text-slate-400">— les réponses des commerciaux sont évaluées là-dessus</span>
        </label>
        <textarea
          value={draft.handlingGuidance}
          onChange={(e) => setDraft({ ...draft, handlingGuidance: e.target.value })}
          rows={3}
          placeholder="Ne jamais justifier le prix seul : ramener au coût du problème actuel, chiffrer le gain, puis proposer un cadrage du ROI."
          className={`${inputClass} resize-y`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Formulations entendues <span className="font-normal text-slate-400">— une par ligne, facultatif</span>
        </label>
        <textarea
          value={draft.examplePhrasings}
          onChange={(e) => setDraft({ ...draft, examplePhrasings: e.target.value })}
          rows={2}
          placeholder={"C'est au-dessus de notre budget\nVotre concurrent est moins cher"}
          className={`${inputClass} resize-y`}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !draft.label.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg brand-gradient px-3 text-[12px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {submitting ? "Enregistrement…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" /> Annuler
        </button>
      </div>
    </div>
  );
}

export default function ObjectionsLibrary({ categories }: { categories: ObjectionCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(categories.length === 0);
  const [importOpen, setImportOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/objections/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la création.");
      }
      setAdding(false);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  }

  async function update(categoryId: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/objections/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToPayload(draft)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la mise à jour.");
      }
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(category: ObjectionCategory) {
    if (
      !window.confirm(
        `Supprimer « ${category.label} » ? Les objections déjà rattachées ne sont pas supprimées, elles repassent en « Non classées ».`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/objections/categories/${category.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-white shadow-[var(--shadow-sm)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <BookOpen className="h-4 w-4 shrink-0 text-[color:var(--violet)]" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">Vos objections de référence</span>
            <span className="block text-xs text-slate-400">
              {categories.length === 0
                ? "Aucune objection définie — les objections des calls ne peuvent pas encore être rangées."
                : `${categories.length} objection${categories.length > 1 ? "s" : ""} · c'est dans ces cases que sont rangées les objections détectées dans les calls`}
            </span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setDraft(EMPTY_DRAFT);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 shadow-[var(--shadow-xs)] transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Plus className="h-4 w-4" /> Ajouter à la main
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 shadow-[var(--shadow-xs)] transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <FileUp className="h-4 w-4" /> Importer un document
            </button>
          </div>

          {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

          {adding && (
            <div className="mb-4">
              <CategoryForm
                draft={draft}
                setDraft={setDraft}
                onSubmit={create}
                onCancel={() => {
                  setAdding(false);
                  setDraft(EMPTY_DRAFT);
                }}
                submitting={submitting}
                submitLabel="Ajouter"
              />
            </div>
          )}

          {categories.length === 0 && !adding ? (
            <p className="text-sm italic text-slate-400">
              Définissez ici les objections qui reviennent le plus souvent et la manière de les traiter. Chaque call
              analysé rangera ensuite automatiquement les objections détectées dans ces cases, et la réponse du
              commercial sera évaluée par rapport à votre méthode.
            </p>
          ) : (
            <ul className="space-y-3">
              {categories.map((category) =>
                editingId === category.id ? (
                  <li key={category.id}>
                    <CategoryForm
                      draft={draft}
                      setDraft={setDraft}
                      onSubmit={() => update(category.id)}
                      onCancel={() => {
                        setEditingId(null);
                        setDraft(EMPTY_DRAFT);
                      }}
                      submitting={submitting}
                      submitLabel="Enregistrer"
                    />
                  </li>
                ) : (
                  <li key={category.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{category.label}</p>
                        {category.description && <p className="mt-1 text-[13px] text-slate-500">{category.description}</p>}
                        {category.handlingGuidance ? (
                          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
                            <span className="font-medium text-slate-700">Comment la traiter : </span>
                            {category.handlingGuidance}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs italic text-amber-600">
                            Pas de méthode définie — les réponses seront évaluées au jugement général, pas par rapport à
                            la vôtre.
                          </p>
                        )}
                        {category.examplePhrasings.length > 0 && (
                          <p className="mt-2 text-xs text-slate-400">
                            {category.examplePhrasings.map((p) => `« ${p} »`).join("  ·  ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(category.id);
                            setAdding(false);
                            setDraft(draftFrom(category));
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Modifier ${category.label}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(category)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Supprimer ${category.label}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}

      {importOpen && <ImportObjectionsModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
