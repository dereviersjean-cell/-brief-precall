"use client";

import { useState } from "react";
import { AnalysisObject } from "./AnalysisObject";
import { SourcesObject } from "./objects";

// « Préparez et exécutez des rendez-vous plus efficaces » (page Commerciaux,
// cadrage GTM du 19/11/2026) : avant, le brief du rendez-vous ; après,
// l'analyse du call. Deux écrans, une bascule.
// Sur grand écran les deux sont empilés dans la même cellule de grille : la
// hauteur ne change pas en basculant (Journey mesure l'objet une seule fois
// pour le mettre à l'échelle). En dessous, l'écran inactif est retiré.

const VIEWS = [
  { key: "avant", label: "Avant le rendez-vous" },
  { key: "apres", label: "Après le rendez-vous" },
] as const;

type View = (typeof VIEWS)[number]["key"];

export function MeetingPairObject() {
  const [view, setView] = useState<View>("avant");
  const panel = (key: View) => (view === key ? "land-swap" : "hidden lg:invisible lg:block");
  return (
    <div>
      <div className="mb-3 flex justify-center">
        <div role="tablist" aria-label="Avant ou après le rendez-vous" className="inline-flex rounded-full bg-land-surface p-1 shadow-[var(--land-shadow)] ring-1 ring-land-line">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={view === v.key}
              onClick={() => setView(v.key)}
              className={`h-9 rounded-full px-4 text-[13.5px] font-medium transition-colors duration-200 ${
                view === v.key ? "bg-land-coral text-white" : "text-land-muted hover:text-land-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid">
        <div className={`[grid-area:1/1] ${panel("avant")}`} aria-hidden={view !== "avant"} inert={view !== "avant"}>
          <SourcesObject />
        </div>
        <div className={`[grid-area:1/1] ${panel("apres")}`} aria-hidden={view !== "apres"} inert={view !== "apres"}>
          <AnalysisObject />
        </div>
      </div>
    </div>
  );
}
