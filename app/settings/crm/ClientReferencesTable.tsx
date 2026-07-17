"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, Trash2, Database, CheckCircle2, AlertTriangle } from "lucide-react";
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

// `version` is bumped by the parent after any import (file upload, Pipedrive,
// HubSpot) so this refetches without the three import flows needing to know
// about each other.
export default function ClientReferencesTable({ version }: { version: number }) {
  const [references, setReferences] = useState<ClientReferenceRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // The upload zone above already covers the "nothing imported yet" case.
  if (references.length === 0) return null;

  const completeCount = references.filter(isComplete).length;
  const completeRate = Math.round((completeCount / references.length) * 100);
  const missingEmbeddingCount = references.filter((r) => !r.has_embedding).length;

  return (
    <div className="mt-6">
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

      {missingEmbeddingCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
          <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
          <p className="text-sm text-amber-800">
            {missingEmbeddingCount} référence{missingEmbeddingCount > 1 ? "s" : ""} sans embedding —{" "}
            {missingEmbeddingCount > 1 ? "elles ne seront jamais proposées" : "elle ne sera jamais proposée"} dans les
            briefs. Réimportez-{missingEmbeddingCount > 1 ? "les" : "la"} si le contenu semble incomplet.
          </p>
        </div>
      )}

      <div className="relative mb-4 w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un client, un secteur…"
          className="pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Aucun résultat pour « {query} ».
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((ref) => {
            const meta = sourceMeta(ref.source);
            const expanded = expandedId === ref.id;
            const complete = isComplete(ref);
            const hasDetail = !!(ref.problem || ref.solution || ref.result || ref.raw_text);

            return (
              <div key={ref.id} className={deletingId === ref.id ? "opacity-40" : ""}>
                <div
                  onClick={() => hasDetail && setExpandedId(expanded ? null : ref.id)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${hasDetail ? "cursor-pointer hover:bg-slate-50" : ""}`}
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
                      handleDelete(ref);
                    }}
                    disabled={deletingId === ref.id}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {hasDetail && (
                    <ChevronDown className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  )}
                </div>
                {expanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50/60">
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
