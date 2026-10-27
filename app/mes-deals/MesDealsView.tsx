"use client";

import { useState } from "react";
import type { DealProgress, FocusStatus } from "@/lib/deal-progress";
import { DealList, FOCUS } from "./deal-ui";

// Vue commercial « Mes deals », resserrée le 27/10/2026 (demande de Jean :
// plus concis, plus clair, plus actionnable). Trois compteurs — à relancer,
// à traiter, en bonne voie — qui filtrent, puis une seule liste : un deal
// par ligne, avec l'action à mener, ouverte sur la page du deal. Le calcul
// est dans lib/deal-progress.ts (dealFocus).

const ORDER: FocusStatus[] = ["relancer", "traiter", "bonne_voie"];

export default function MesDealsView({ deals, closed }: { deals: DealProgress[]; closed: number }) {
  const [filter, setFilter] = useState<FocusStatus | null>(null);
  if (deals.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-500">
        Aucun deal suivi pour l&apos;instant : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }
  const counts = Object.fromEntries(ORDER.map((k) => [k, deals.filter((d) => d.focus.status === k).length])) as Record<FocusStatus, number>;
  const shown = filter ? deals.filter((d) => d.focus.status === filter) : deals;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {ORDER.map((k) => {
          const f = FOCUS[k];
          const on = filter === k;
          return (
            <button
              key={k}
              onClick={() => setFilter(on ? null : k)}
              className={`rounded-2xl border border-border bg-white px-4 py-3.5 text-left transition-shadow hover:shadow-sm ${on ? `ring-2 ${f.ring}` : ""}`}
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600">
                <span className={`h-2 w-2 rounded-full ${f.dot}`} />
                {f.label}
              </span>
              <span className="mt-1 block text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{counts[k]}</span>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {filter ? FOCUS[filter].label : "À faire, deal par deal"}
          </h2>
          {filter && (
            <button onClick={() => setFilter(null)} className="text-[12.5px] text-slate-500 hover:text-slate-900">
              Tout afficher
            </button>
          )}
        </div>
        {shown.length === 0 ? <p className="px-5 py-4 text-[13.5px] text-slate-500">Aucun deal ici.</p> : <DealList deals={shown} />}
      </section>

      {closed > 0 && (
        <p className="text-[12.5px] text-slate-500">
          {closed} deal{closed > 1 ? "s" : ""} clos dans HubSpot, non affiché{closed > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}
