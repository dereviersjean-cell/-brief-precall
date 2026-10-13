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
  manual: { label: "Manuel", className: "bg-[color:var(--lavender)] text-[color:var(--violet)]" },
  pipedrive: { label: "Pipedrive", className: "bg-emerald-50 text-emerald-700" },
  hubspot: { label: "HubSpot", className: "bg-orange-50 text-orange-700" },
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
const KEY_FIELDS: { key: keyof ClientReferenceRow; label: string }[] = [
  { key: "sector", label: "secteur" },
  { key: "problem", label: "problématique" },
  { key: "solution", label: "solution" },
  { key: "result", label: "résultat chiffré" },
];

function missingFields(ref: ClientReferenceRow): string[] {
  return KEY_FIELDS.filter((f) => !ref[f.key]).map((f) => f.label);
}

function isComplete(ref: ClientReferenceRow): boolean {
  return missingFields(ref).length === 0;
}

// Compact 4-segment gauge: one segment per key field, filled when present.
// The title attribute spells out what's missing on hover.
function CompletenessGauge({ reference }: { reference: ClientReferenceRow }) {
  const missing = missingFields(reference);
  const title =
    missing.length === 0
      ? "Profil complet — matching optimal dans les briefs"
      : `Manque : ${missing.join(", ")}`;
  return (
    <span className="inline-flex items-center gap-0.5 shrink-0" title={title}>
      {KEY_FIELDS.map((f) => (
        <span
          key={f.key}
          className={`h-1.5 w-3 rounded-full ${reference[f.key] ? "bg-[color:var(--success)]" : "bg-slate-200"}`}
        />
      ))}
    </span>
  );
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
    "w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]";

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[12px] font-medium text-slate-700">Nom du client</label>
        <input
          value={value.client_name}
          onChange={(e) => set("client_name", e.target.value)}
          placeholder="ex. Velbrun Capital"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-700">Secteur</label>
          <input value={value.sector} onChange={(e) => set("sector", e.target.value)} placeholder="ex. SaaS" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-700">Taille d&apos;entreprise</label>
          <input
            value={value.company_size}
            onChange={(e) => set("company_size", e.target.value)}
            placeholder="ex. 50-200"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-slate-700">Problématique</label>
        <textarea value={value.problem} onChange={(e) => set("problem", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-slate-700">Solution</label>
        <textarea value={value.solution} onChange={(e) => set("solution", e.target.value)} rows={2} className={`${inputClass} resize-y`} />
      </div>
      <div>
        <label className="mb-1 block text-[12px] font-medium text-slate-700">Résultat chiffré</label>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-md)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-[16px] font-semibold text-slate-900">Ajouter une référence client</h2>
        <ReferenceFormFields value={form} onChange={setForm} />
        {error && <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.client_name.trim() || loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div key={i} className="h-14 rounded-2xl border border-border bg-white" />
        ))}
      </div>
    );
  }

  const hasAny = references.length > 0;
  const completeCount = references.filter(isComplete).length;
  const completeRate = hasAny ? Math.round((completeCount / references.length) * 100) : 0;
  const missingEmbeddingCount = references.filter((r) => !r.has_embedding).length;
  const incompleteCount = references.length - completeCount;
  // Most frequently missing key field across the base — drives the "what's
  // missing" banner toward the single most actionable fix.
  const missingCounts = KEY_FIELDS.map((f) => ({
    label: f.label,
    count: references.filter((r) => !r[f.key]).length,
  })).filter((m) => m.count > 0);
  const topMissingLabel = missingCounts.sort((a, b) => b.count - a.count)[0]?.label ?? null;

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
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-[color:var(--warning-soft)] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
          <p className="text-[13px] leading-relaxed text-amber-800">
            {missingEmbeddingCount} référence{missingEmbeddingCount > 1 ? "s" : ""} sans empreinte vectorielle —{" "}
            {missingEmbeddingCount > 1 ? "elles ne seront jamais proposées" : "elle ne sera jamais proposée"} dans les
            briefs. Ouvrez-{missingEmbeddingCount > 1 ? "les" : "la"} et cliquez sur Enregistrer pour relancer le calcul.
          </p>
        </div>
      )}

      {incompleteCount > 0 && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-[color:var(--lavender)] px-4 py-3">
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" />
          <p className="text-[13px] leading-relaxed text-slate-600">
            {incompleteCount} profil{incompleteCount > 1 ? "s" : ""} incomplet{incompleteCount > 1 ? "s" : ""}
            {topMissingLabel && ` (le plus souvent : ${topMissingLabel} manquant)`} — une référence incomplète est
            moins bien rapprochée des prospects et donc moins souvent citée dans vos briefs. La jauge de chaque ligne
            indique ce qui manque.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, un secteur…"
            className="h-9 w-full rounded-xl border border-border bg-white pl-9 pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Ajouter une référence
        </button>
      </div>

      {!hasAny ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
          <p className="text-[13.5px] text-slate-500">
            Aucune référence pour l&apos;instant. Importez un fichier ci-dessus ou ajoutez-en une manuellement.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-[13.5px] text-slate-500">
          Aucun résultat pour « {query} ».
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
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
                      <p className="truncate text-[13.5px] font-semibold text-slate-900">{ref.client_name || "Sans nom"}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                      {!ref.has_embedding && (
                        <span className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
                          Sans embedding
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                      {[ref.sector, ref.company_size].filter(Boolean).join(" · ") || "Secteur et taille non renseignés"}
                      {" · "}
                      {formatDate(ref.created_at)}
                    </p>
                  </div>
                  {complete ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <CompletenessGauge reference={ref} />}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editing) cancelEdit();
                      else startEdit(ref);
                    }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-[color:var(--danger-soft)] hover:text-rose-600"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>
                {expanded && (
                  <div className="border-t border-border bg-slate-50 px-4 py-4">
                    {editing ? (
                      <div>
                        <ReferenceFormFields value={editDraft} onChange={setEditDraft} />
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={cancelEdit}
                            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => saveEdit(ref.id)}
                            disabled={savingEdit || !editDraft.client_name.trim()}
                            className="inline-flex h-8 items-center rounded-lg bg-[color:var(--primary)] px-3 text-[12.5px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingEdit ? "Enregistrement…" : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ref.problem && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Problématique</p>
                            <p className="text-[13.5px] leading-relaxed text-slate-600">{ref.problem}</p>
                          </div>
                        )}
                        {ref.solution && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Solution</p>
                            <p className="text-[13.5px] leading-relaxed text-slate-600">{ref.solution}</p>
                          </div>
                        )}
                        {ref.result && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Résultat</p>
                            <p className="text-[13.5px] leading-relaxed text-slate-600">{ref.result}</p>
                          </div>
                        )}
                        {!ref.problem && !ref.solution && !ref.result && ref.raw_text && (
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Texte brut</p>
                            <p className="text-[13.5px] leading-relaxed text-slate-600 whitespace-pre-wrap">{ref.raw_text}</p>
                          </div>
                        )}
                        {!hasDetail && (
                          <p className="text-[13px] italic text-slate-500">
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
