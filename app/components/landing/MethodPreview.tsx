import { NB } from "./team-data";

// La page Méthode de l'app (app/methode/page.tsx, 05/11 puis 14/11/2026), au
// format réel et en lecture seule : ses trois blocs numérotés —
//   1. Objectifs par étape commerciale (étapes du pipeline HubSpot, méthode
//      de qualification, bouton Modifier du manager) ;
//   2. Objections et réponses (les plus rencontrées en trois mois, le début
//      de la consigne, le nombre de fois et la part bien traitée) ;
//   3. Références clients (comptées en trois niveaux, trois exemples).
// Remplace l'aperçu de la page Playbook : la grille de notation pondérée et
// les étapes reconnues au titre du rendez-vous ont été supprimées de l'app le
// 05/11/2026.

const STAGES: [string, string[]][] = [
  ["Qualification", ["Douleur", "Impact", "Décideur", "Échéance"]],
  ["Évaluation", ["Critères de décision", "Budget", "Process de décision"]],
  ["Proposition", ["Allié chez le client"]],
  ["Négociation", []],
];

const OBJECTIONS: { label: string; guidance: string; handling: string; bad?: boolean }[] = [
  {
    label: "Prix et budget",
    guidance: "Ne pas baisser le prix : ramener au coût du problème, chiffré avec le prospect.",
    handling: "14 fois · 64 % bien traitées",
  },
  {
    label: "Charge de déploiement pour l'équipe",
    guidance: "Chiffrer l'effort demandé et citer un déploiement comparable.",
    handling: "9 fois · 33 % bien traitées",
    bad: true,
  },
  {
    label: "Solution déjà en place",
    guidance: "Faire décrire ce que la solution actuelle ne couvre pas avant de comparer.",
    handling: "6 fois · 67 % bien traitées",
  },
];

const LEVELS: [number, string, string][] = [
  [24, "références", "bg-land-sunken text-land-ink"],
  [9, "preuves de ROI (résultat chiffré)", "bg-emerald-50 text-emerald-800"],
  [11, "cas d'usage (problème et solution)", "bg-land-accent-soft text-land-accent"],
  [4, "références simples (nom et activité)", "bg-land-sunken text-land-ink"],
];

const EXAMPLES: [string, string, string][] = [
  ["Cartonnerie du Val", "Emballage", "Délais clients tenus dès le premier mois du deuxième site, sans recrutement au planning."],
  ["Lumen Logistique", "Transport et logistique", "Temps de préparation des tournées divisé par deux en un trimestre."],
  ["Atelier Moreau", "Mobilier sur mesure", "Devis envoyés en 24 heures au lieu de cinq jours."],
];

const CARD = "rounded-2xl border border-land-line bg-land-surface p-4 sm:p-5";
const LINK = "text-[13px] font-semibold text-land-accent";

export function MethodPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
      <div>
        <div className="p-3 sm:p-5">
          <div className="px-1 pb-4 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">Méthode de vente de l&apos;équipe</div>
            <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-land-ink">Méthode</div>
            <p className="mt-0.5 text-[13px] text-land-muted">
              Ce que l&apos;équipe doit obtenir à chaque étape, comment répondre aux objections, quels clients citer.
            </p>
          </div>

          <div className="space-y-3">
            {/* 1. Objectifs par étape commerciale */}
            <section className={CARD}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="text-[15.5px] font-semibold text-land-ink">
                  1. Objectifs par étape commerciale
                  <span className="ml-2 text-[13px] font-normal text-land-muted">étapes du pipeline HubSpot</span>
                </div>
                <span className={LINK}>Modifier</span>
              </div>
              <p className="mt-1 text-[13px] text-land-muted">Méthode MEDDIC. Ce qui est confirmé reste acquis d&apos;une étape à l&apos;autre.</p>
              <div className="mt-3.5 grid grid-cols-1 items-start gap-x-4 gap-y-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
                {STAGES.map(([label, goals]) => (
                  <div key={label} className="contents">
                    <span className="pt-0.5 text-[13.5px] font-semibold text-land-ink">{label}</span>
                    {goals.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {goals.map((g) => (
                          <span key={g} className="rounded-full bg-land-sunken px-2.5 py-1 text-[12.5px] text-land-ink">
                            {g}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="pt-0.5 text-[13px] text-land-muted">Ce qui manque encore sur le deal.</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 2. Objections et réponses */}
            <section className={CARD}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="text-[15.5px] font-semibold text-land-ink">
                  2. Objections et réponses
                  <span className="ml-2 text-[13px] font-normal text-land-muted">7 objections de référence · 3 derniers mois</span>
                </div>
                <span className={LINK}>Voir les 7</span>
              </div>
              <ul className="mt-2">
                {OBJECTIONS.map((o) => (
                  <li key={o.label} className="border-t border-land-line py-2.5 first:border-t-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <span className="text-[13.5px] font-semibold text-land-ink">{o.label}</span>
                      <span className={`text-[12.5px] tabular-nums ${o.bad ? "text-rose-700" : "text-land-muted"}`}>{o.handling.replace(/ %/g, `${NB}%`)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-land-muted">{o.guidance.replace(/ :/g, `${NB}:`)}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[12.5px] text-land-muted">
                4 objections rencontrées ne rentrent dans aucune catégorie. <span className="font-semibold text-land-accent">Voir les catégories suggérées</span>
              </p>
            </section>

            {/* 3. Références clients */}
            <section className={CARD}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="text-[15.5px] font-semibold text-land-ink">3. Références clients</div>
                <span className={LINK}>Voir les 24</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2 text-[13px]">
                {LEVELS.map(([n, label, tone]) => (
                  <span key={label} className={`rounded-lg px-3 py-1.5 ${tone}`}>
                    <strong className="tabular-nums">{n}</strong> {label}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {EXAMPLES.map(([name, sector, result]) => (
                  <div key={name} className="rounded-xl border border-land-line px-3.5 py-3">
                    <div className="text-[13.5px] font-semibold text-land-ink">{name}</div>
                    <div className="text-[12px] text-land-faint">{sector}</div>
                    <p className="mt-1 text-[12.5px] leading-snug text-land-muted">{result}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
        Exemple au format réel de la page Méthode. Objectifs, objections et références fictifs, modifiables par le manager.
      </div>
    </div>
  );
}
