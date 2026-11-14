"use client";

import { useState } from "react";
import type { TeamPerson } from "./team";
import type { SuiviDeal } from "@/lib/deal-suivi";
import SuiviView from "./SuiviView";
import ForecastView from "./ForecastView";
import type { ForecastPeriod, ForecastPerson } from "@/lib/deal-forecast";

// Les onglets de Suivi des deals : « Par commercial » (03/11/2026) et
// Prévision (10/11/2026). Les onglets Règles et HubSpot ont été retirés le
// 10/11/2026 à la demande de Jean (historique git) ; les champs HubSpot se
// règlent toujours depuis la fiche d'un call.
const TABS = [
  ["suivi", "Suivi"],
  ["prevision", "Prévision"],
] as const;

type Tab = (typeof TABS)[number][0];

export default function DealsBoardClient({
  teamPeople,
  suiviDeals,
  hasTeam,
  forecast,
  initialTab,
}: {
  forecast: { people: ForecastPerson[]; periods: ForecastPeriod[]; today: string };
  teamPeople: TeamPerson[];
  suiviDeals: SuiviDeal[];
  hasTeam: boolean;
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
      {tab === "suivi" ? <SuiviView deals={suiviDeals} people={teamPeople} hasTeam={hasTeam} /> : <ForecastView {...forecast} hasTeam={hasTeam} />}
    </div>
  );
}
