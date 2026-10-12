// Équipe d'exemple de la landing : quatre commerciaux fictifs, cohérents avec
// le reste de la page (Thomas mène le call Valdor ; Julie et Karim sont cités
// dans le bilan de la semaine). Les notes par dimension reprennent la grille
// de l'analyse de call (AnalysisObject) et leur moyenne pondérée redonne la
// note affichée — même calcul que l'app (`computeWeightedGlobalScore`).
// Portraits générés par IA (Higgsfield, 12/10/2026).

export const DIMENSIONS = [
  { short: "Ouverture", abbr: "Ouv.", label: "Ouverture et cadrage", weight: 1 },
  { short: "Découverte", abbr: "Décou.", label: "Découverte du pain business", weight: 3 },
  { short: "Qualification", abbr: "Qualif.", label: "Qualification décision et achat", weight: 2 },
  { short: "Pitch", abbr: "Pitch", label: "Pitch et démo", weight: 1 },
  { short: "Objections", abbr: "Object.", label: "Traitement des objections", weight: 1 },
  { short: "Closing", abbr: "Closing", label: "Closing de l'étape suivante", weight: 2 },
] as const;

export const WEEKS = ["25 août", "1er sept.", "8 sept.", "15 sept.", "22 sept.", "29 sept."];

export type Rep = {
  id: string;
  name: string;
  first: string;
  she?: boolean;
  role: string;
  photo: string;
  calls: number;
  briefs: number;
  /** Note moyenne par semaine (WEEKS). */
  trend: number[];
  /** Notes par dimension, dans l'ordre de DIMENSIONS. */
  dims: number[];
  /** Métriques d'interaction, mêmes définitions que Performance › Analytics. */
  talk: number; // % du temps de parole
  monologue: number; // secondes, plus long monologue moyen
  story: number; // secondes, plus longue réponse prospect
  interactivity: number; // sur 10
  patience: number; // secondes
  questions: number; // questions par heure
  avgDuration: number; // minutes
  weekly: number; // RDV par semaine
  /** Objections rencontrées : [catégorie, bien, partiellement, sans réponse]. */
  objections: [string, number, number, number][];
};

export const REPS: Rep[] = [
  {
    id: "thomas",
    name: "Thomas Lefèvre",
    first: "Thomas",
    role: "Account executive",
    photo: "/landing/people/avatar-thomas.jpg",
    calls: 14,
    briefs: 17,
    trend: [3.0, 3.1, 3.0, 3.2, 3.3, 3.4],
    dims: [3.6, 3.2, 3.3, 4.0, 2.3, 4.1],
    talk: 41,
    monologue: 105,
    story: 80,
    interactivity: 6.1,
    patience: 0.9,
    questions: 14.2,
    avgDuration: 44,
    weekly: 2.3,
    objections: [
      ["Charge de déploiement", 1, 1, 1],
      ["Prix", 1, 1, 0],
      ["Pas le bon moment", 1, 0, 0],
    ],
  },
  {
    id: "julie",
    name: "Julie Marchand",
    first: "Julie",
    she: true,
    role: "Account executive",
    photo: "/landing/people/avatar-julie.jpg",
    calls: 18,
    briefs: 19,
    trend: [3.6, 3.7, 3.7, 3.8, 3.8, 3.9],
    dims: [3.2, 4.0, 4.0, 3.9, 4.3, 3.8],
    talk: 44,
    monologue: 90,
    story: 115,
    interactivity: 6.8,
    patience: 1.1,
    questions: 16.5,
    avgDuration: 41,
    weekly: 3.0,
    objections: [
      ["Prix", 4, 1, 0],
      ["Charge de déploiement", 2, 1, 0],
      ["Pas le bon moment", 1, 0, 0],
    ],
  },
  {
    id: "karim",
    name: "Karim Benali",
    first: "Karim",
    role: "Business developer",
    photo: "/landing/people/avatar-karim.jpg",
    calls: 11,
    briefs: 14,
    trend: [3.0, 3.1, 2.9, 3.0, 2.8, 2.9],
    dims: [3.8, 2.2, 2.8, 3.6, 2.7, 3.2],
    talk: 68,
    monologue: 190,
    story: 40,
    interactivity: 3.9,
    patience: 0.5,
    questions: 7.8,
    avgDuration: 31,
    weekly: 1.8,
    objections: [
      ["On a déjà un outil", 1, 1, 2],
      ["Charge de déploiement", 0, 1, 1],
      ["Prix", 0, 0, 0],
    ],
  },
  {
    id: "lea",
    name: "Léa Fontaine",
    first: "Léa",
    she: true,
    role: "Commerciale, arrivée en septembre",
    photo: "/landing/people/avatar-lea.jpg",
    calls: 9,
    briefs: 11,
    trend: [2.6, 2.8, 2.9, 3.1, 3.2, 3.3],
    dims: [3.4, 3.9, 2.6, 3.1, 3.0, 3.5],
    talk: 39,
    monologue: 70,
    story: 95,
    interactivity: 5.6,
    patience: 1.2,
    questions: 13.1,
    avgDuration: 38,
    weekly: 1.5,
    objections: [
      ["Pas le bon moment", 1, 1, 0],
      ["On a déjà un outil", 0, 1, 0],
      ["Charge de déploiement", 0, 1, 0],
    ],
  },
];

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Moyenne d'équipe = moyenne des commerciaux, pas des calls (règle de l'app). */
export const TEAM = {
  trend: WEEKS.map((_, w) => mean(REPS.map((r) => r.trend[w]))),
  dims: DIMENSIONS.map((_, d) => mean(REPS.map((r) => r.dims[d]))),
  calls: REPS.reduce((a, r) => a + r.calls, 0),
  briefs: REPS.reduce((a, r) => a + r.briefs, 0),
};

/** Objections de l'équipe par catégorie, agrégées depuis les commerciaux. */
export function teamObjections() {
  const map = new Map<string, { good: number; part: number; none: number; reps: Set<string> }>();
  for (const r of REPS)
    for (const [cat, g, p, n] of r.objections) {
      if (g + p + n === 0) continue;
      const e = map.get(cat) ?? { good: 0, part: 0, none: 0, reps: new Set<string>() };
      e.good += g;
      e.part += p;
      e.none += n;
      e.reps.add(r.id);
      map.set(cat, e);
    }
  return [...map.entries()]
    .map(([cat, e]) => ({ cat, good: e.good, part: e.part, none: e.none, reps: e.reps.size }))
    .sort((a, b) => b.good + b.part + b.none - (a.good + a.part + a.none));
}

export const fr = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
export const NB = " ";
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
