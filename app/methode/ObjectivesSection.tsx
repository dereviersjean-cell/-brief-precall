"use client";

import { useState } from "react";
import { RulesEditor } from "@/app/deals/DealRulesForm";
import { METHODS, OBJECTIVE_RANKS, qualificationLabel, type DealRules } from "@/lib/deal-rules";

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";

// Bloc « Objectifs par rendez-vous » de la page Méthode (maquette G1 B,
// 05/11/2026) : en lecture, une ligne de pastilles par rendez-vous ; le
// manager l'ouvre pour régler la méthode de qualification et les objectifs
// (les seuils et les étapes restent dans Suivi des deals › Règles). Les
// règles sont enregistrées entières : ce bloc ne touche qu'à ses champs.
export default function ObjectivesSection({ number, initialRules, canEdit }: { number: number; initialRules: DealRules; canEdit: boolean }) {
  const [rules, setRules] = useState(initialRules);
  const [draft, setDraft] = useState<DealRules | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function save() {
    if (!draft) return;
    setStatus("saving");
    const res = await fetch("/api/deals/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules: draft }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { rules?: DealRules };
    if (res?.ok && data.rules) {
      setRules(data.rules);
      setDraft(null);
      setStatus("idle");
    } else {
      setStatus("error");
    }
  }

  const fields = new Set<string>(METHODS[rules.method].fields);

  return (
    <section className={CARD} aria-labelledby="methode-objectifs">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="methode-objectifs" className="text-[17px] font-semibold text-slate-900">
          {number}. Objectifs par rendez-vous
        </h2>
        {canEdit && !draft && (
          <button onClick={() => setDraft(rules)} className="text-[13.5px] font-semibold text-[color:var(--violet)] hover:underline">
            Modifier
          </button>
        )}
      </div>
      <p className="mt-1 text-[13.5px] text-slate-500">
        Méthode {METHODS[rules.method].label}. Ce que vos commerciaux doivent obtenir à chaque rendez-vous : le brief le leur rappelle, la page du
        meeting dit ce qui a été obtenu, et ce qui manque passe au rendez-vous suivant.
      </p>

      {draft ? (
        <div className="mt-5 space-y-4">
          <RulesEditor rules={draft} onChange={setDraft} stageLabels={{}} sections={["method", "objectives"]} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={status === "saving"}
              className="inline-flex h-10 items-center rounded-full bg-[color:var(--primary)] px-5 text-[13.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {status === "saving" ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              onClick={() => {
                setDraft(null);
                setStatus("idle");
              }}
              className="text-[13px] text-slate-500 hover:text-slate-900"
            >
              Annuler
            </button>
            {status === "error" && <span className="text-[13px] text-rose-700">Enregistrement impossible. Réessayez.</span>}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[56px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 text-[14px]">
          {Array.from({ length: OBJECTIVE_RANKS }, (_, i) => i + 1).map((rank) => {
            const keys = (rules.callObjectives[rank] ?? []).filter((k) => fields.has(k));
            return (
              <div key={rank} className="contents">
                <span
                  className={`justify-self-start rounded-md px-1.5 py-0.5 text-[12.5px] font-bold tabular-nums ${
                    rank > 1 ? "bg-[color:var(--violet)] text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
                  }`}
                >
                  {rank === OBJECTIVE_RANKS ? `R${rank}+` : `R${rank}`}
                </span>
                {keys.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {keys.map((k) => (
                      <span key={k} className="rounded-full bg-slate-100 px-2.5 py-1 text-[13px] text-slate-800">
                        {qualificationLabel(k)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="pt-0.5 text-[13.5px] text-slate-500">Ce qui manque encore sur le deal.</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
