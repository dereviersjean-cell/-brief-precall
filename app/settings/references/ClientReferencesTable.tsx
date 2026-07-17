"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, Trash2, Pencil, X, Plus, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import StatTile from "@/app/dashboard/StatTile";

type ClientReferenceRow = {
  id: string;
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  raw_text: string | null;
  source: string | null;
  has_embedding: boolean;
  created_at: string;
};

type ReferenceFormData = {
  client_name: string;
  sector: string;
  company_size: string;
  problem: string;
  solution: string;
  result: string;
};

const EMPTY_FORM: ReferenceFormData = {
  client_name: "",
  sector: "",
  company_size: "",
  problem: "",
  solution: "",
  result: "",
};

const SOURCE_META: Record<string, { label: string; className: string }> = {
  upload: { label: "Fichier", className: "bg-slate-100 text-slate-600" },
  manual: { label: "Manuel", className: "bg-violet-50 text-violet-600" },
  pipedrive: { label: "Pipedrive", className: "bg-emerald-50 text-emerald-600" },
  hubspot: { label: "HubSpot", className: "bg-orange-50 text-orange-600" },
};

function sourceMeta(source: string | null) {
  return SOURCE_META[source ?? ""] ?? { label: source ?? "—", className: "bg-slate-100 text-slate-600" };
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// A "complete" profile is what actually feeds a rich embedding in
// saveClientReferences (sector + problem + solution + result + client_name)
// — this is the signal that decides whether a reference can meaningfully
// surface as a relevant match in a future brief.
function isComplete(ref: ClientReferenceRow): boolean {
  return !!ref.sector && !!ref.problem && !!ref.solution && !!ref.result;
}

function toFormData(ref: ClientReferenceRow): ReferenceFormData {
  return {
    client_name: ref.client_name ?? "",
    sector: ref.sector ?? "",
    company_size: ref.company_size ?? "",
    problem: ref.problem ?? "",
    solution: ref.solution ?? "",
    result: ref.result ?? "",
  };
}

// Shared by the "add" modal and the inline edit form — same six fields
// either way, so the markup lives in one place.
function ReferenceFormFields({ value, onChange }: { value: ReferenceFormData; onChange: (next: ReferenceFormData) => void }) {
  function set<K extends keyof ReferenceFormData>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nom du client</label>
        <input
          value={value.client_name}
          onChange={(e) => set("client_name", e.target.value)}
          placeholder="ex. Velbrun Capital"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Secteur</label>
          <input value={value.sector} onChange={(e) => set("sector", e.target.value)} placeholder="ex. SaaS" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Taille d&apos;entreprise</label>
          <input
            value={value.company_size}
            onChange={(e) => set("company_size", e.target.value)}
            placeholder="ex. 50-200"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Problématique</label>
        <textarea value={value.problem} onChange={(e) => set("problem", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Solution</label>
        <textarea value={value.solution} onChange={(e) => set("solution", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Résultat chiffré</label>
        <textarea value={value.result} onChange={(e) => set("result", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </div>
    </div>
  );
}

function AddReferenceModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: ReferenceFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ReferenceFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!form.client_name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-slate-900 mb-4">Ajouter une référence client</h2>
        <ReferenceFormFields value={form} onChange={setForm} />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.client_name.trim() || loading}
            className="h-9 px-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// `version` is bumped by the parent after any file import so this refetches
// without the upload flow needing to know about this component's internals.
export default function ClientReferencesTable({ version }: { version: number }) {
  const [references, setReferences] = useState<ClientReferenceRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ReferenceFormData>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch("/api/client-references")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ClientReferenceRow[]) => setReferences(data))
      .catch(() => setReferences([]));
  }, [version]);

  async function handleDelete(ref: ClientReferenceRow) {
    if (!window.confirm(`Supprimer la référence ${ref.client_name ?? "sans nom"} ?`)) return;
    setDeletingId(ref.id);
    try {
      const res = await fetch(`/api/client-references/${ref.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setReferences((prev) => (prev ?? []).filter((r) => r.id !== ref.id));
    } catch {
      window.alert("Erreur lors de la suppression.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(form: ReferenceFormData) {
    const res = await fetch("/api/client-references", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur lors de la création.");
    setReferences((prev) => [data as ClientReferenceRow, ...(prev ?? [])]);
    setShowAddModal(false);
  }

  function startEdit(ref: ClientReferenceRow) {
    setExpandedId(ref.id);
    setEditingId(ref.id);
    setEditDraft(toFormData(ref));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(refId: string) {
    if (!editDraft.client_name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/client-references/${refId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur lors de la mise à jour.");
      setReferences((prev) => (prev ?? []).map((r) => (r.id === refId ? (data as ClientReferenceRow) : r)));
      setEditingId(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setSavingEdit(false);
    }
  }

  const filtered = useMemo(() => {
    if (!references) return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return references;
    return references.filter(
      (r) => (r.client_name ?? "").toLowerCase().includes(trimmed) || (r.sector ?? "").toLowerCase().includes(trimmed)
    );
  }, [references, query]);

  if (references === null) {
    return (
      <div className="mt-6 space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-white rounded-2xl border border-slate-200" />
        ))}
      </div>
    );
  }

  const hasAny = references.length > 0;
  const completeCount = references.filter(isComplete).length;
  const completeRate = hasAny ? Math.round((completeCount / references.length) * 100) : 0;
  const missingEmbeddingCount = references.filter((r) => !r.has_embedding).length;

  return (
    <div className="mt-6">
      {hasAny && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatTile index={0} accent="indigo" label="Références" value={references.length} icon={<Database className="w-3.5 h-3.5" />} />
          <StatTile
            index={1}
            accent="emerald"
            label="Profils complets"
            value={completeRate}
            suffix="%"
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          />
          <StatTile
            index={2}
            accent="amber"
            label="Sans embedding"
            value={missingEmbeddingCount}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
        </div>
      )}

      {missingEmbeddingCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
          <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
          <p className="text-sm text-amber-800">
            {missingEmbeddingCount} référence{missingEmbeddingCount > 1 ? "s" : ""} sans empreinte vectorielle —{" "}
            {missingEmbeddingCount > 1 ? "elles ne seront jamais proposées" : "elle ne sera jamais proposée"} dans les
            briefs. Ouvrez-{missingEmbeddingCount > 1 ? "les" : "la"} et cliquez sur Enregistrer pour relancer le calcul.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, un secteur…"
            className="pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 h-9 px-3.5 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/30 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Ajouter une référence
        </button>
      </div>

      {!hasAny ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-500 text-sm">
            Aucune référence pour l&apos;instant. Importez un fichier ci-dessus ou ajoutez-en une manuellement.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Aucun résultat pour « {query} ».
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((ref) => {
            const meta = sourceMeta(ref.source);
            const expanded = expandedId === ref.id;
            const editing = editingId === ref.id;
            const complete = isComplete(ref);
            const hasDetail = !!(ref.problem || ref.solution || ref.result || ref.raw_text);

            return (
              <div key={ref.id} className={deletingId === ref.id ? "opacity-40" : ""}>
                <div
                  onClick={() => !editing && setExpandedId(expanded ? null : ref.id)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${!editing ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900 text-sm truncate">{ref.client_name || "Sans nom"}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                      {!ref.has_embedding && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                          Sans embedding
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {[ref.sector, ref.company_size].filter(Boolean).join(" · ") || "Secteur et taille non renseignés"}
                      {" · "}
                      {formatDate(ref.created_at)}
                    </p>
                  </div>
                  {complete && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editing) cancelEdit();
                      else startEdit(ref);
                    }}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    aria-label={editing ? "Annuler la modification" : "Modifier"}
                  >
                    {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(ref);
                    }}
                    disabled={deletingId === ref.id}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>
                {expanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/60">
                    {editing ? (
                      <div>
                        <ReferenceFormFields value={editDraft} onChange={setEditDraft} />
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={cancelEdit}
                            className="h-8 px-3.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors bg-white"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => saveEdit(ref.id)}
                            disabled={savingEdit || !editDraft.client_name.trim()}
                            className="h-8 px-3.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {savingEdit ? "Enregistrement…" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ref.problem && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Problématique</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{ref.problem}</p>
                          </div>
                        )}
                        {ref.solution && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Solution</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{ref.solution}</p>
                          </div>
                        )}
                        {ref.result && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Résultat</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{ref.result}</p>
                          </div>
                        )}
                        {!ref.problem && !ref.solution && !ref.result && ref.raw_text && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Texte brut</p>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ref.raw_text}</p>
                          </div>
                        )}
                        {!hasDetail && (
                          <p className="text-sm text-slate-400 italic">
                            Aucun détail pour cette référence — cliquez sur{" "}
                            <Pencil className="w-3 h-3 inline -mt-0.5" /> pour la compléter.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && <AddReferenceModal onClose={() => setShowAddModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
