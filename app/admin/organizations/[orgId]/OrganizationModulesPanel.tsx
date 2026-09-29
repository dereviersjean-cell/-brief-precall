"use client";

import { useState } from "react";
import { MODULES, type ModuleKey } from "@/lib/modules";

// Les modules d'un client, dans l'ordre du parcours (document « Brief —
// Parcours client type »). Chaque interrupteur enregistre aussitôt la liste
// complète : le client voit le module apparaître dès qu'il revient sur son
// onglet (ModulesProvider relit la liste au retour du focus).
//
// Le socle (agenda, briefs, analyse des calls) n'est pas ici : il ne se
// désactive pas.
export default function OrganizationModulesPanel({
  organizationId,
  initialModules,
  initialExplicit,
  migrated,
}: {
  organizationId: string;
  initialModules: ModuleKey[];
  initialExplicit: boolean;
  migrated: boolean;
}) {
  const [modules, setModules] = useState<ModuleKey[]>(initialModules);
  const [explicit, setExplicit] = useState(initialExplicit);
  const [pending, setPending] = useState<ModuleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: ModuleKey) {
    const previous = modules;
    const next = modules.includes(key) ? modules.filter((m) => m !== key) : [...modules, key];
    setModules(next);
    setPending(key);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la mise à jour.");
      }
      setExplicit(true);
    } catch (err) {
      setModules(previous);
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setPending(null);
    }
  }

  // Parcours d'abord (par semaine), puis les modules à la demande.
  const ordered = [...MODULES].sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
  const openCount = modules.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-sm font-semibold text-slate-900">Modules du client</h2>
        <span className="text-xs text-slate-400 shrink-0">
          {openCount} sur {MODULES.length} ouverts
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Un module fermé est invisible pour le client : ni menu, ni page. L&apos;agenda, les briefs et l&apos;analyse des
        calls sont toujours ouverts.
      </p>

      {!migrated && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          La migration 019 n&apos;est pas encore passée sur Supabase : tous les modules restent ouverts et ces
          interrupteurs ne peuvent rien enregistrer.
        </p>
      )}
      {migrated && !explicit && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Client antérieur au parcours : tous ses modules sont ouverts. Le premier réglage fixe la liste.
        </p>
      )}

      <div className="divide-y divide-slate-100">
        {ordered.map((m) => {
          const on = modules.includes(m.key);
          return (
            <div key={m.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{m.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {m.week ? `Semaine ${m.week}` : "À la demande"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
              </div>
              <button
                onClick={() => void toggle(m.key)}
                disabled={pending !== null || !migrated}
                aria-pressed={on}
                aria-label={`${on ? "Fermer" : "Ouvrir"} le module ${m.label}`}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  on ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    on ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  );
}
