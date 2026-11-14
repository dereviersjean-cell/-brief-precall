"use client";

import { useState } from "react";
import { RulesEditor } from "@/app/deals/DealRulesForm";
import { DEFAULT_STAGE_LABELS, METHODS, qualificationLabel, type DealRules } from "@/lib/deal-rules";

const CARD = "rounded-2xl border border-border bg-white p-5 sm:p-6";

// Bloc « Objectifs par étape commerciale » de la page Méthode (maquette G1 B ;
// par étape et non plus par rendez-vous depuis le 14/11/2026, réponse d'Hubert
// à E1) : en lecture, une ligne de pastilles par étape ; le manager l'ouvre
// pour régler la méthode de qualification et les objectifs. `stageLabels` =
// les étapes du pipeline HubSpot (1 = la première) ; vide, les trois étapes
// par défaut. Les règles sont enregistrées entières : ce bloc ne touche qu'à
// ses champs.
export default function ObjectivesSection({
  number,
  initialRules,
  canEdit,
  stageLabels,
}: {
  number: number;
  initialRules: DealRules;
  canEdit: boolean;
  stageLabels: Record<number, string>;
}) {
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
  const fromHubspot = Object.keys(stageLabels).length > 0;
  const stages = fromHubspot
    ? Object.entries(stageLabels)
        .map(([n, label]) => ({ n: Number(n), label }))
        .sort((a, b) => a.n - b.n)
    : DEFAULT_STAGE_LABELS.map((label, i) => ({ n: i + 1, label }));

  return (
    <section className={CARD} aria-labelledby="methode-objectifs">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="methode-objectifs" className="text-[17px] font-semibold text-slate-900">
          {number}. Objectifs par étape commerciale
          <span className="ml-2 text-[14px] font-normal text-slate-500">{fromHubspot ? "étapes du pipeline HubSpot" : "étapes par défaut"}</span>
        </h2>
        {canEdit && !draft && (
          <button onClick={() => setDraft(rules)} className="text-[13.5px] font-semibold text-[color:var(--violet)] hover:underline">
            Modifier
          </button>
        )}
      </div>
      <p className="mt-1 text-[13.5px] text-slate-500">Méthode {METHODS[rules.method].label}. Ce qui est confirmé reste acquis d&apos;une étape à l&apos;autre.</p>

      {draft ? (
        <div className="mt-5 space-y-4">
          <RulesEditor rules={draft} onChange={setDraft} stageLabels={stageLabels} sections={["method", "stages"]} />
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
        <div className="mt-4 grid grid-cols-1 items-start gap-x-4 gap-y-3 text-[14px] sm:grid-cols-[190px_minmax(0,1fr)]">
          {stages.map(({ n, label }) => {
            const keys = (rules.stageRequirements[n] ?? []).filter((k) => fields.has(k));
            return (
              <div key={n} className="contents">
                <span className="pt-0.5 text-[14px] font-semibold text-slate-900">{label}</span>
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
