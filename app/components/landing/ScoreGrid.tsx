"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

// Le différenciateur de Brief rendu manipulable : le MÊME call (« Présentation
// Valdor Emballages », un R2) noté sur la grille de chaque étape. On voit la
// note changer et on lit pourquoi — un R1 n'est pas jugé comme un R3. Les
// critères, poids et notes sont des exemples (libellé « Exemple » en pied).
type Stage = "R1" | "R2" | "R3";

const STAGES: Record<
  Stage,
  { label: string; criteria: [string, number, number][]; caption: string }
> = {
  R1: {
    label: "Découverte",
    criteria: [
      ["Questions de découverte", 2, 2.5],
      ["Besoin qualifié", 2, 3.5],
      ["Décideurs identifiés", 1, 2.5],
      ["Prochaine étape obtenue", 1, 4.0],
    ],
    caption:
      "Noté comme une découverte, le call perdrait des points sur les questions posées. Ce n'était plus son objet.",
  },
  R2: {
    label: "Présentation",
    criteria: [
      ["Personnalisation de la démo", 2, 4.0],
      ["Traitement des objections", 2, 3.0],
      ["Implication des décideurs", 1, 2.5],
      ["Prochaine étape obtenue", 1, 4.0],
    ],
    caption:
      "Étape détectée depuis le titre du rendez-vous, « Présentation Valdor Emballages ». Le call est noté sur la grille R2 de votre équipe.",
  },
  R3: {
    label: "Closing",
    criteria: [
      ["Budget validé", 2, 2.0],
      ["Objections prix traitées", 1, 2.5],
      ["Engagement sur une date", 2, 2.0],
      ["Prochaine étape obtenue", 1, 4.0],
    ],
    caption:
      "Noté comme un closing, on lui reprocherait de ne pas avoir validé le budget. Ce n'était pas son rôle : Brief ne le fait pas.",
  },
};

const fr = (n: number) => n.toFixed(1).replace(".", ",");

export function ScoreGrid() {
  const [stage, setStage] = useState<Stage>("R2");
  const s = STAGES[stage];
  const total = s.criteria.reduce((a, [, w]) => a + w, 0);
  const score = s.criteria.reduce((a, [, w, v]) => a + w * v, 0) / total;

  return (
    <div className="rounded-[20px] border border-land-line bg-land-surface shadow-[var(--land-shadow-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-7">
        <div>
          <div className="text-[13px] font-medium text-land-muted">Grille de votre équipe</div>
          <div className="mt-0.5 text-[17px] font-semibold tracking-tight text-land-ink">Présentation Valdor Emballages</div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-land-muted">Note du call</div>
          <div key={stage} className="land-swap text-[34px] font-semibold leading-none tracking-tight tabular-nums text-land-ink">
            {fr(score)}
            <span className="text-[17px] font-medium text-land-faint">{" "}/{" "}5</span>
          </div>
        </div>
      </div>

      <div className="mt-5 px-6 sm:px-7">
        <div role="group" aria-label="Noter ce call comme" className="inline-flex rounded-full bg-land-sunken p-1">
          {(Object.keys(STAGES) as Stage[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={stage === key}
              onClick={() => setStage(key)}
              className={`h-9 rounded-full px-3.5 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
                stage === key
                  ? "bg-land-surface text-land-ink shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]"
                  : "text-land-muted hover:text-land-ink"
              }`}
            >
              {key} <span className="hidden sm:inline">{STAGES[key].label}</span>
              {key === "R2" && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-land-accent align-middle" aria-label="étape détectée" />}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-4 px-6 py-6 sm:px-7">
        {s.criteria.map(([label, weight, value], i) => (
          // Lignes stables d'une étape à l'autre : les barres glissent vers leur
          // nouvelle valeur au lieu de réapparaître.
          <li key={i}>
            <div
              key={stage}
              className="land-swap flex items-baseline justify-between gap-3 text-[14.5px]"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="text-land-ink">
                {label}
                <span className="ml-2 text-[12.5px] tabular-nums text-land-faint">×{weight}</span>
              </span>
              <span className="font-medium tabular-nums text-land-ink">{fr(value)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-land-sunken">
              <div
                className={`land-bar h-full w-full rounded-full ${stage === "R2" ? "bg-land-accent" : "bg-land-ink/70"}`}
                style={{ transform: `scaleX(${value / 5})` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p key={`c-${stage}`} className="land-swap mx-6 border-t border-land-line pt-4 text-[14px] leading-relaxed text-land-muted sm:mx-7" aria-live="polite">
        {s.caption}
      </p>

      <div className="mx-6 mb-6 mt-5 rounded-xl bg-land-sunken px-4 py-3.5 sm:mx-7">
        <div className="text-[12.5px] font-medium text-land-warn">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />
          Objection à <span className="tabular-nums">21:04</span>, partiellement traitée
        </div>
        <p className="mt-1 text-[14.5px] leading-snug text-land-ink">
          «{" "}Notre équipe est déjà surchargée, une nouvelle intégration me fait peur.{" "}»
        </p>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple. Critères, pondération et notes fictifs.
      </div>
    </div>
  );
}
