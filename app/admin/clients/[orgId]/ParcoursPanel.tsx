"use client";

import { useState } from "react";
import { MODULES, type AccessLevel, type ModuleKey } from "@/lib/modules";
import { PARCOURS_LAST_WEEK } from "@/lib/parcours";

// Le parcours d'un client, semaine par semaine (document « Brief — Parcours
// client type »), avec l'interrupteur de chaque module. Chaque bascule
// enregistre aussitôt la liste complète : le client voit le module apparaître
// dès qu'il revient sur son onglet (ModulesProvider relit la liste au retour
// du focus). Les semaines 0 à 2 présentent le socle, toujours ouvert.

const SOCLE_WEEKS: Record<number, { label: string; description: string }> = {
  0: { label: "Mise en route", description: "Comptes, invitations, agendas branchés." },
  1: { label: "Briefs avant rendez-vous", description: "Socle — toujours ouvert." },
  2: { label: "Analyse des calls", description: "Socle — toujours ouvert." },
};

function Toggle({ on, disabled, label, onClick }: { on: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={`${on ? "Fermer" : "Ouvrir"} le module ${label}`}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "brand-gradient" : "bg-slate-200"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function ParcoursPanel({
  organizationId,
  initialModules,
  inParcours,
  available,
  currentWeek,
  initialAccessLevel,
}: {
  organizationId: string;
  initialModules: ModuleKey[];
  inParcours: boolean;
  available: boolean;
  currentWeek: number | null;
  initialAccessLevel: AccessLevel;
}) {
  const [modules, setModules] = useState<ModuleKey[]>(initialModules);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initialAccessLevel);
  const [explicit, setExplicit] = useState(inParcours);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: ModuleKey) {
    const previous = modules;
    const next = modules.includes(key) ? modules.filter((m) => m !== key) : [...modules, key];
    setModules(next);
    setPending(true);
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
      setPending(false);
    }
  }

  // Inscription libre (migration 024) : briefs uniquement tant que ce n'est
  // pas basculé. Le client voit l'accès complet dès son retour sur l'onglet.
  async function toggleAccess() {
    const previous = accessLevel;
    const next: AccessLevel = accessLevel === "full" ? "briefs" : "full";
    setAccessLevel(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${organizationId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Erreur lors de la mise à jour.");
      }
    } catch (err) {
      setAccessLevel(previous);
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setPending(false);
    }
  }

  const weeks = Array.from({ length: PARCOURS_LAST_WEEK + 1 }, (_, week) => week);
  const onDemand = MODULES.filter((m) => m.week === null);

  return (
    <section className="bg-white rounded-2xl border border-border p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Parcours</h2>
        <span className="text-xs text-slate-400">
          {modules.length} sur {MODULES.length} modules ouverts
        </span>
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-4">Un module fermé est invisible pour le client : ni menu, ni page.</p>

      <div
        className={`mb-4 flex items-center justify-between gap-4 rounded-xl px-3 py-3 ${
          accessLevel === "briefs" ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">Accès complet</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {accessLevel === "briefs"
              ? "Inscription libre : briefs uniquement, 10 par jour. Ouvrir donne l'agenda, l'enregistrement et l'analyse des calls."
              : "Socle ouvert : agenda, enregistrement, analyse des calls, briefs sans le plafond de 10 par jour."}
          </p>
        </div>
        <Toggle on={accessLevel === "full"} disabled={pending} label="Accès complet" onClick={() => void toggleAccess()} />
      </div>

      {!available && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          La migration 019 n&apos;est pas passée : tous les modules restent ouverts et ne peuvent pas être réglés.
        </p>
      )}
      {available && !explicit && (
        <p className="mb-4 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Client antérieur au parcours : tous ses modules sont ouverts. Le premier réglage fixe la liste.
        </p>
      )}

      <ol className="relative">
        {weeks.map((week) => {
          const weekModules = MODULES.filter((m) => m.week === week);
          const socle = SOCLE_WEEKS[week];
          const isCurrent = explicit && currentWeek === week;
          const isPast = explicit && currentWeek !== null && week < currentWeek;
          return (
            <li
              key={week}
              className={`flex gap-4 rounded-xl px-3 py-3 ${isCurrent ? "bg-[color:var(--lavender)] ring-1 ring-[color:var(--lavender-strong)]" : ""}`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isCurrent ? "brand-gradient text-white" : isPast ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                S{week}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {isCurrent && <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--violet)]">Cette semaine</p>}
                {socle && (
                  <div>
                    <p className="text-sm font-medium text-slate-800">{socle.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{socle.description}</p>
                  </div>
                )}
                {weekModules.map((m) => {
                  const on = modules.includes(m.key);
                  const late = !on && isPast;
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {m.label}
                          {late && <span className="ml-2 text-[11px] font-semibold text-red-600">En retard</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                      </div>
                      <Toggle on={on} disabled={pending || !available} label={m.label} onClick={() => void toggle(m.key)} />
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2 px-3">À la demande</p>
        {onDemand.map((m) => {
          const on = modules.includes(m.key);
          return (
            <div key={m.key} className="flex items-center justify-between gap-4 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{m.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
              </div>
              <Toggle on={on} disabled={pending || !available} label={m.label} onClick={() => void toggle(m.key)} />
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
    </section>
  );
}
