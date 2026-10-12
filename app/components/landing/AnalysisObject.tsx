"use client";

import { useState } from "react";
import { Clock, Users } from "lucide-react";

// L'analyse d'un call telle que /feedback/[id] la restitue : note globale et
// sentiment, « qui a parlé, et quand », notes par dimension du playbook de
// l'équipe (pondérées) avec leur explication, prochaine étape.
//
// La bascule R1/R2/R3 suit le fonctionnement réel : les DIMENSIONS restent
// celles du playbook, c'est la CONSIGNE de l'étape (définie par le manager,
// injectée dans l'analyse) qui change la façon de les juger. Le même call noté
// comme une découverte ou comme un closing n'obtient donc pas la même note —
// c'est pourquoi Brief reconnaît l'étape depuis le titre du rendez-vous.
// Notes, explications et pondérations : exemples (mention en pied).

type Stage = "R1" | "R2" | "R3";

const DIMENSIONS: { label: string; weight: number }[] = [
  { label: "Ouverture et cadrage", weight: 1 },
  { label: "Découverte du pain business", weight: 3 },
  { label: "Qualification décision et achat", weight: 2 },
  { label: "Pitch et démo", weight: 1 },
  { label: "Traitement des objections", weight: 1 },
  { label: "Closing de l'étape suivante", weight: 2 },
];

const STAGES: Record<
  Stage,
  { label: string; consigne: string; scores: number[]; focus: number; why: string }
> = {
  R1: {
    label: "Découverte",
    consigne: "Laisser le prospect parler (moins de 40 % du temps), aucun pitch avant d'avoir reformulé le besoin.",
    scores: [4, 2.5, 3, 2.5, 2, 4],
    focus: 3,
    why: "Noté comme une découverte, le call perdrait des points : la démo arrive avant que le besoin soit reformulé. Ce n'était plus son objet.",
  },
  R2: {
    label: "Présentation",
    consigne: "Démo calée sur les besoins exprimés en R1, décideur présent ou invité au rendez-vous suivant.",
    scores: [4, 3, 3.5, 4, 2, 4],
    focus: 4,
    why: "Objection sur la charge de l'équipe (21:04) partiellement traitée : Thomas rassure sur le support, sans chiffrer l'effort ni citer de déploiement comparable. Claire y revient en fin d'appel.",
  },
  R3: {
    label: "Closing",
    consigne: "Budget validé, date de signature et circuit de décision confirmés avant de raccrocher.",
    scores: [4, 3, 2, 4, 2, 2],
    focus: 5,
    why: "Noté comme un closing, on lui reprocherait l'absence de date de signature. Ce n'était pas son rôle : Brief ne le juge pas ainsi.",
  },
};

const SPEAKERS: { name: string; share: number; tone: string; turns: [number, number][] }[] = [
  { name: "Thomas Lefèvre (vous)", share: 41, tone: "bg-land-accent", turns: [[0, 6], [9, 14], [22, 34], [41, 44], [52, 60], [71, 75], [88, 96]] },
  { name: "Claire Mercier", share: 38, tone: "bg-land-ink/70", turns: [[6, 9], [14, 22], [34, 41], [44, 52], [75, 82], [96, 100]] },
  { name: "Hugo Ravel, DAF", share: 21, tone: "bg-land-warn/80", turns: [[60, 71], [82, 88]] },
];

const fr = (n: number) => n.toFixed(1).replace(".", ",");
const NB = " ";
const nb = (s: string) => s.replace(/ ([:;?!»%])/g, `${NB}$1`).replace(/« /g, `«${NB}`);

export function AnalysisObject() {
  const [stage, setStage] = useState<Stage>("R2");
  const s = STAGES[stage];
  const total = DIMENSIONS.reduce((a, dim) => a + dim.weight, 0);
  const score = DIMENSIONS.reduce((a, dim, i) => a + dim.weight * s.scores[i], 0) / total;

  return (
    <div className="overflow-hidden rounded-[20px] border border-land-line bg-land-surface shadow-[var(--land-shadow-lg)]">
      <div className="flex items-start justify-between gap-4 border-b border-land-line px-6 py-4 sm:px-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-semibold tracking-tight text-land-ink">Présentation Valdor Emballages</span>
            <span className="rounded-full bg-land-accent-soft px-2 py-0.5 text-[11px] font-semibold text-land-accent">
              R2 Présentation
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-land-muted">
            <span className="tabular-nums">Jeu. 2{NB}oct. · 14:30</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> <span className="tabular-nums">47{NB}min</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden /> 3 participants
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div key={stage} className="land-swap text-[32px] font-semibold leading-none tracking-tight tabular-nums text-land-ink">
            {fr(score)}
            <span className="text-[15px] font-medium text-land-faint">/5</span>
          </div>
          {/* Hors de l'étape détectée, la note est une hypothèse : on le dit
              plutôt que de laisser lire 2,7 comme le verdict de Brief. */}
          {stage === "R2" ? (
            <span className="mt-1.5 inline-block rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-land-accent">
              positif
            </span>
          ) : (
            <span className="mt-1.5 block text-[11.5px] font-medium text-land-warn">si noté comme un {stage}</span>
          )}
        </div>
      </div>

      {/* Qui a parlé, et quand */}
      <div className="border-b border-land-line px-6 py-4 sm:px-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Qui a parlé, et quand</div>
        {/* Une ligne par intervenant sur grand écran (nom · frise · part),
            deux sur téléphone. */}
        <div className="mt-3 space-y-2.5">
          {SPEAKERS.map((sp) => (
            <div
              key={sp.name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[13px] sm:grid-cols-[10.5rem_minmax(0,1fr)_2.5rem]"
            >
              <span className="truncate text-land-ink">{sp.name}</span>
              <span className="text-right tabular-nums text-land-faint sm:col-start-3">{sp.share}{NB}%</span>
              <div className="relative col-span-2 h-2 overflow-hidden rounded-full bg-land-sunken sm:col-span-1 sm:col-start-2 sm:row-start-1">
                {sp.turns.map(([a, b]) => (
                  <span
                    key={a}
                    className={`absolute inset-y-0 rounded-full ${sp.tone}`}
                    style={{ left: `${a}%`, width: `${b - a}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes par dimension, selon l'étape */}
      <div className="px-6 pt-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Grille de votre équipe</div>
          <div role="group" aria-label="Noter ce call comme" className="inline-flex rounded-full bg-land-sunken p-1">
            {(Object.keys(STAGES) as Stage[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={stage === key}
                onClick={() => setStage(key)}
                className={`h-8 rounded-full px-3 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  stage === key
                    ? "bg-land-surface text-land-ink shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]"
                    : "text-land-muted hover:text-land-ink"
                }`}
              >
                {key}
                <span className="hidden sm:inline"> {STAGES[key].label}</span>
                {key === "R2" && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-land-accent align-middle" aria-label="étape détectée" />
                )}
              </button>
            ))}
          </div>
        </div>
        <p key={`c-${stage}`} className="land-swap mt-2.5 rounded-xl bg-land-bg px-3.5 py-2.5 text-[13px] leading-relaxed text-land-muted">
          <span className="font-medium text-land-ink">Consigne {stage} de votre manager{NB}:</span> {nb(s.consigne)}
        </p>
      </div>

      <ul className="space-y-2.5 px-6 py-4 sm:px-7">
        {DIMENSIONS.map((dim, i) => {
          const v = s.scores[i];
          const focus = i === s.focus;
          return (
            // Lignes stables d'une étape à l'autre : les barres glissent vers
            // leur nouvelle valeur au lieu de réapparaître.
            <li key={dim.label}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[13.5px] sm:grid-cols-[14rem_minmax(0,1fr)_2rem]">
                <span className={`truncate ${focus ? "font-medium text-land-ink" : "text-land-ink"}`}>
                  {dim.label}
                  <span className="ml-1.5 text-[12px] tabular-nums text-land-faint">×{dim.weight}</span>
                </span>
                <span
                  key={`${stage}-${i}`}
                  className="land-swap text-right font-medium tabular-nums text-land-ink sm:col-start-3"
                  style={{ "--i": i } as React.CSSProperties}
                >
                  {fr(v)}
                </span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-land-sunken sm:col-span-1 sm:col-start-2 sm:row-start-1">
                  <div
                    className={`land-bar h-full w-full rounded-full ${v < 2.5 ? "bg-land-warn/80" : "bg-land-accent"}`}
                    style={{ transform: `scaleX(${v / 5})` }}
                  />
                </div>
              </div>
              {focus && (
                <p key={`w-${stage}`} className="land-swap mt-2 text-[13px] leading-relaxed text-land-muted" aria-live="polite">
                  {nb(s.why)}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-land-line px-6 py-4 sm:px-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-land-faint">Prochaine étape</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-land-ink">
          R3 le jeudi 9{NB}octobre à 10:00 avec Hugo Ravel (DAF). Envoyer aujourd&apos;hui le récapitulatif promis et
          l&apos;exemple de déploiement de la Cartonnerie du Val.
        </p>
      </div>
      <div className="border-t border-land-line px-6 py-3 text-[12px] text-land-faint sm:px-7">
        Exemple, au format réel. Call, notes et pondérations fictifs.
      </div>
    </div>
  );
}
