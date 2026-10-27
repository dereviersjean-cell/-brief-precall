"use client";

import { useEffect, useState } from "react";
import { DEFAULT_RULES, MAX_STAGES, METHODS, OBJECTIVE_RANKS, qualificationLabel, type DealRules, type QualificationMethod } from "@/lib/deal-rules";

// Onglet « Règles » de Deals de l'équipe (27/10/2026) : le manager règle
// lui-même la méthode de qualification, les objectifs de chaque rendez-vous
// (27/10/2026), les seuils et ce qui doit être connu à chaque étape
// (lib/deal-rules.ts). Les critères sont indicatifs : ils
// lèvent une alerte, ils ne bloquent rien.

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

// L'éditeur des règles, sans lecture ni enregistrement : partagé par l'onglet
// Règles du manager et le setup HubSpot de l'admin (27/10/2026).
export function RulesEditor({
  rules,
  onChange,
  stageLabels,
}: {
  rules: DealRules;
  onChange: (rules: DealRules) => void;
  stageLabels: Record<number, string>;
}) {
  const fields = METHODS[rules.method].fields;
  const update = (patch: Partial<DealRules>) => onChange({ ...rules, ...patch });
  const toggle = (stage: number, key: (typeof fields)[number]) => {
    const current = rules.stageRequirements[stage] ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    update({ stageRequirements: { ...rules.stageRequirements, [stage]: next } });
  };
  const toggleObjective = (rank: number, key: (typeof fields)[number]) => {
    const current = rules.callObjectives[rank] ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    update({ callObjectives: { ...rules.callObjectives, [rank]: next } });
  };

  return (
    <div className="space-y-5">
      <section className={CARD}>
        <h2 className={`${LABEL} mb-3`}>Méthode de qualification</h2>
        <p className="mb-3 text-[13px] text-slate-500">Ce que Brief vérifie sur chaque deal : la checklist du brief, la qualification d&apos;un call, ce qui reste à obtenir.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(METHODS) as QualificationMethod[]).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 ${rules.method === m ? "border-[color:var(--violet)] bg-[color:var(--lavender)]/40" : "border-border"}`}
            >
              <input type="radio" name="method" checked={rules.method === m} onChange={() => update({ method: m })} className="mt-1" />
              <span>
                <span className="block text-[13.5px] font-semibold text-slate-900">{METHODS[m].label}</span>
                <span className="block text-[12.5px] text-slate-500">{METHODS[m].fields.map((k) => qualificationLabel(k)).join(" · ")}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <h2 className={`${LABEL} mb-1`}>Objectifs de chaque rendez-vous</h2>
        <p className="mb-4 text-[13px] text-slate-500">
          Ce que vos commerciaux doivent aller chercher à chaque rendez-vous. Après le call, Brief dit ce qui a été obtenu clairement ; ce qui ne l&apos;est
          pas est reporté au rendez-vous suivant, avec la question à poser.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="text-[12px] text-slate-500">
                <th className="py-2 pr-3 font-medium">Rendez-vous</th>
                {fields.map((k) => (
                  <th key={k} className="px-2 py-2 text-center font-medium">
                    {qualificationLabel(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: OBJECTIVE_RANKS }, (_, i) => i + 1).map((rank) => (
                <tr key={rank} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium text-slate-900">{rank === OBJECTIVE_RANKS ? `R${rank} et suivants` : `R${rank}`}</td>
                  {fields.map((k) => (
                    <td key={k} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${qualificationLabel(k)} au R${rank}`}
                        checked={(rules.callObjectives[rank] ?? []).includes(k)}
                        onChange={() => toggleObjective(rank, k)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={CARD}>
        <h2 className={`${LABEL} mb-3`}>Seuils</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13.5px] font-medium text-slate-900">Deal à relancer après</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={3}
                max={90}
                value={rules.inactivityDays}
                onChange={(e) => update({ inactivityDays: Number(e.target.value) })}
                className="h-9 w-20 rounded-lg border border-border bg-white px-2 text-[13px] tabular-nums"
              />
              <span className="text-[13px] text-slate-600">jours sans call</span>
            </span>
          </label>
          <label className="block">
            <span className="text-[13.5px] font-medium text-slate-900">Étape plus longue que d&apos;habitude au-delà de</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={rules.slowStageFactor}
                onChange={(e) => update({ slowStageFactor: Number(e.target.value) })}
                className="h-9 w-20 rounded-lg border border-border bg-white px-2 text-[13px] tabular-nums"
              />
              <span className="text-[13px] text-slate-600">fois la durée habituelle</span>
            </span>
          </label>
        </div>
      </section>

      <section className={CARD}>
        <h2 className={`${LABEL} mb-1`}>Ce qui doit être connu à chaque étape</h2>
        <p className="mb-4 text-[13px] text-slate-500">
          Cumulatif : à l&apos;étape 3, Brief vérifie ce que demandent les étapes 1, 2 et 3. Étapes du pipeline HubSpot, ou R1, R2… pour un deal hors
          HubSpot. Indicatif : un manque lève l&apos;alerte « Critère de passage manquant », rien n&apos;est bloqué.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="text-[12px] text-slate-500">
                <th className="py-2 pr-3 font-medium">Étape</th>
                {fields.map((k) => (
                  <th key={k} className="px-2 py-2 text-center font-medium">
                    {qualificationLabel(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_STAGES }, (_, i) => i + 1).map((stage) => (
                <tr key={stage} className="border-t border-border">
                  <td className="py-2 pr-3 text-slate-900">
                    <span className="font-medium">Étape {stage}</span>
                    {stageLabels[stage] ? <span className="text-slate-500"> · {stageLabels[stage]}</span> : <span className="text-slate-400"> · R{stage}</span>}
                  </td>
                  {fields.map((k) => (
                    <td key={k} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${qualificationLabel(k)} à l'étape ${stage}`}
                        checked={(rules.stageRequirements[stage] ?? []).includes(k)}
                        onChange={() => toggle(stage, k)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default function DealRulesForm({ stageLabels }: { stageLabels: Record<number, string> }) {
  const [rules, setRules] = useState<DealRules | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/deals/rules")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { rules: DealRules }) => !cancelled && setRules(data.rules))
      .catch(() => !cancelled && setRules(DEFAULT_RULES));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!rules) return <p className="text-[13.5px] text-slate-500">Chargement des règles…</p>;

  const update = (next: DealRules) => {
    setRules(next);
    setStatus("idle");
  };

  async function save() {
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/deals/rules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { rules?: DealRules; error?: string };
    if (res?.ok && data.rules) {
      setRules(data.rules);
      setStatus("saved");
    } else {
      setError(data.error ?? "Enregistrement impossible.");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      <RulesEditor rules={rules} onChange={update} stageLabels={stageLabels} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="inline-flex h-10 items-center rounded-full bg-[color:var(--primary)] px-5 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {status === "saving" ? "Enregistrement…" : "Enregistrer les règles"}
        </button>
        <button onClick={() => update(DEFAULT_RULES)} className="text-[13px] text-slate-500 hover:text-slate-900">
          Revenir aux règles par défaut
        </button>
        {status === "saved" && <span className="text-[13px] text-emerald-700">Enregistré. Les vues des deals en tiennent compte dès leur prochain affichage.</span>}
        {status === "error" && error && <span className="text-[13px] text-rose-700">{error}</span>}
      </div>
    </div>
  );
}
