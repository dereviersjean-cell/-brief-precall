import { FileUp, Layers, Plus } from "lucide-react";
import { NB } from "./team-data";

// La page Playbook de l'app (Performance › Playbook), au format réel et en
// lecture seule : les dimensions de la grille avec leur poids et leurs
// questions, l'import depuis un document, puis les étapes R1 / R2 / R3 avec
// leurs motifs de titre et la consigne d'analyse (MeetingStagesSection).
// Mêmes dimensions et mêmes poids que l'analyse de call de la page.

const DIMS: { label: string; key: string; weight: number; description: string; criteria: string[] }[] = [
  {
    label: "Découverte du pain business",
    key: "decouverte",
    weight: 3,
    description: "Faire exprimer le problème et son coût avant de présenter quoi que ce soit.",
    criteria: [
      "Le prospect a-t-il décrit le problème avec ses propres mots ?",
      "L'impact du problème a-t-il été chiffré (temps, argent, clients) ?",
      "Le commercial a-t-il reformulé le besoin avant de présenter ?",
    ],
  },
  {
    label: "Qualification décision et achat",
    key: "qualification",
    weight: 2,
    description: "Savoir qui décide, avec quel budget et quel calendrier.",
    criteria: ["Le décideur est-il identifié, ou invité au rendez-vous suivant ?", "Budget et calendrier ont-ils été abordés ?"],
  },
];

const STAGES: { short: string; label: string; patterns: string[]; guidance?: string }[] = [
  { short: "R1", label: "Découverte", patterns: ["Rencontre", "Découverte"] },
  {
    short: "R2",
    label: "Présentation",
    patterns: ["Présentation", "Démo"],
    guidance:
      "Démo calée sur les besoins exprimés en R1. Décideur présent ou invité au rendez-vous suivant. Ne pas parler prix avant d'avoir montré la valeur.",
  },
  { short: "R3", label: "Closing", patterns: ["Closing", "Signature"] },
];

export function PlaybookPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-land-line bg-land-surface px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">Performance · Playbook</div>
          <div className="mt-0.5 text-[16px] font-semibold text-land-ink">Méthode de vente de l&apos;équipe</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-land-line bg-land-surface px-3 text-[12.5px] font-medium text-land-muted">
            <FileUp className="h-3.5 w-3.5" aria-hidden /> Importer depuis Notion, Word ou PDF
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-land-accent px-3 text-[12.5px] font-medium text-white">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Dimension
          </span>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        {DIMS.map((d) => (
          <div key={d.key} className="rounded-2xl border border-land-line bg-land-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-[14.5px] font-semibold text-land-ink">{d.label}</div>
              <span className="mt-0.5 shrink-0 font-mono text-[11px] text-land-faint">{d.key}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-land-muted">{d.description}</p>
            <div className="mt-3 flex items-center gap-2 border-b border-land-line pb-3 text-[12px] text-land-muted">
              Poids
              <span className="grid h-7 w-10 place-items-center rounded-lg border border-land-line text-[13px] font-semibold text-land-ink">
                {d.weight}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {d.criteria.map((c) => (
                <li key={c} className="text-[13px] text-land-ink">
                  {c.replace(/ \?/g, `${NB}?`)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-2xl border border-dashed border-land-line px-4 py-2.5 text-[12.5px] text-land-muted">
          + 4 autres dimensions : ouverture et cadrage, pitch et démo, traitement des objections, closing de l&apos;étape
          suivante
        </div>

        {/* Étapes R1 / R2 / R3 */}
        <div className="rounded-2xl border border-land-line bg-land-surface p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-land-accent-soft text-land-accent">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-land-ink">Étapes de rendez-vous (R1 / R2 / R3)</div>
              <div className="text-[12px] text-land-muted">Reconnues depuis le titre du rendez-vous dans l&apos;agenda.</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STAGES.map((st) => (
              <div
                key={st.short}
                className={`rounded-xl border px-3 py-2.5 ${st.guidance ? "border-land-accent/40 bg-land-accent-soft" : "border-land-line"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-land-accent text-[10.5px] font-semibold text-white">{st.short}</span>
                  <span className="text-[13px] font-semibold text-land-ink">{st.label}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {st.patterns.map((p) => (
                    <span key={p} className="rounded-full border border-land-line bg-land-surface px-2 py-0.5 text-[11.5px] text-land-muted">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-land-bg px-3.5 py-2.5 text-[12.5px] leading-relaxed text-land-muted">
            <span className="font-medium text-land-ink">Consigne R2{NB}:</span> {STAGES[1].guidance}
          </div>
        </div>
      </div>
      <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
        Exemple au format réel de la page Playbook. Grille et consignes fictives, modifiables par le manager.
      </div>
    </div>
  );
}
