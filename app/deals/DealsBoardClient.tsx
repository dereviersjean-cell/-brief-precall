"use client";

import Link from "next/link";
import { useState } from "react";
import type { TeamPerson } from "./team";
import SuiviView from "./SuiviView";
import DealRulesForm from "./DealRulesForm";
import HubspotView from "./HubspotView";
import ForecastView from "./ForecastView";
import type { ForecastPeriod, ForecastPerson } from "@/lib/deal-forecast";

// Les onglets de Suivi des deals : « Par commercial » (03/11/2026),
// Prévision (10/11/2026), Règles, HubSpot. L'ancienne file « Où intervenir » et son bandeau d'étapes ont été
// retirés le 03/11/2026 (historique git) : ils n'étaient plus affichés.
const TABS = [
  ["suivi", "Par commercial"],
  ["prevision", "Prévision"],
  ["regles", "Règles"],
  ["hubspot", "HubSpot"],
] as const;

type Tab = (typeof TABS)[number][0];

export default function DealsBoardClient({
  teamPeople,
  hasTeam,
  stageLabels,
  forecast,
  initialTab,
}: {
  forecast: { people: ForecastPerson[]; periods: ForecastPeriod[]; today: string };
  teamPeople: TeamPerson[];
  hasTeam: boolean;
  stageLabels: Record<number, string>;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className="space-y-6">
      <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-8 rounded-full px-3.5 text-[13px] font-medium ${tab === key ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-slate-500 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "suivi" ? <SuiviView people={teamPeople} hasTeam={hasTeam} /> : tab === "prevision" ? <ForecastView {...forecast} hasTeam={hasTeam} /> : tab === "hubspot" ? <HubspotView /> : (
        <>
          <p className="mb-4 text-[13.5px] text-slate-500">
            La méthode de qualification et les objectifs de chaque rendez-vous se règlent dans{" "}
            <Link href="/methode" className="font-semibold text-[color:var(--violet)] hover:underline">Méthode</Link>.
          </p>
          <DealRulesForm stageLabels={stageLabels} sections={["thresholds", "stages"]} />
        </>
      )}
    </div>
  );
}
