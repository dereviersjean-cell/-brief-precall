import type { CommercialDigestData, ContactOverviewItem, ObjectionCategoryStat } from "./db";
import type { ScoreTrendWeek } from "./dashboard";
import type { RecentCallRow } from "@/app/dashboard/RecentCallsList";

// Jeu de données d'exemple des routes /demo.
//
// Pourquoi des ROUTES dédiées et pas un mode démo sur les vraies pages : un
// drapeau qui reste actif par accident ferait regarder de fausses données à un
// utilisateur en lui laissant croire que ce sont les siennes. Sur un produit
// qui sert à juger la performance de commerciaux, c'est le pire scénario
// possible. Avec des routes séparées, la contamination est structurellement
// impossible — les vraies pages ne connaissent même pas ce fichier.
//
// Contrainte de conception : le jeu doit être COHÉRENT d'un écran à l'autre.
// Le call qui apparaît dans la vue d'ensemble est celui dont on lit les
// objections ; le score affiché est celui de la courbe. Un jeu de données
// incohérent se remarque immédiatement et décrédibilise la démonstration.
//
// Il est aussi volontairement IMPARFAIT : un commercial fictif à 4,8/5 qui
// traite toutes ses objections ne montre rien. Ici il progresse, mais bute
// sur les objections — c'est ce qui rend le produit lisible.

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

export const DEMO_USER_NAME = "Camille Roussel";

export const demoWeekStats: CommercialDigestData = {
  calls_count: 4,
  briefs_count: 6,
  avg_score: 3.4,
  prev_avg_score: 3.1,
  quotes_sent: 0,
  quotes_accepted: 0,
};

// Six semaines de progression, avec un creux — une courbe qui ne fait que
// monter ne ressemble à aucune réalité commerciale.
export const demoTrendWeeks: ScoreTrendWeek[] = [
  [35, 2.6, 3],
  [28, 2.9, 5],
  [21, 2.7, 4],
  [14, 3.2, 6],
  [7, 3.1, 4],
  [0, 3.4, 4],
].map(([offset, avgScore, callsCount]) => {
  const weekStart = new Date(Date.now() - offset * DAY);
  return {
    weekStart,
    weekLabel: weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    avgScore,
    callsCount,
  };
});

export const demoRecentCalls: RecentCallRow[] = [
  { id: "demo-1", name: "Velbrun Capital", dateLabel: "hier", score: 3.4 },
  { id: "demo-2", name: "Groupe Marceau", dateLabel: "il y a 3 j", score: 4.1 },
  { id: "demo-3", name: "Atelier Fontaine", dateLabel: "il y a 4 j", score: 2.6 },
  { id: "demo-4", name: "Neveu & Associés", dateLabel: "il y a 6 j", score: 3.5 },
  { id: "demo-5", name: "Cabinet Lantier", dateLabel: "il y a 8 j", score: 2.9 },
];

export const demoContacts: ContactOverviewItem[] = [
  {
    contact_email: "a.ravachol@velbruncapital.fr",
    company_name: "Velbrun Capital",
    last_contact_at: daysAgo(1),
    video_call_count: 2,
    emails_sent_count: 3,
    replies_count: 1,
  },
  {
    contact_email: "s.marceau@groupe-marceau.com",
    company_name: "Groupe Marceau",
    last_contact_at: daysAgo(3),
    video_call_count: 1,
    emails_sent_count: 2,
    replies_count: 2,
  },
  {
    contact_email: "contact@atelier-fontaine.fr",
    company_name: "Atelier Fontaine",
    last_contact_at: daysAgo(4),
    video_call_count: 1,
    emails_sent_count: 1,
    replies_count: 0,
  },
  {
    contact_email: "p.neveu@neveu-associes.fr",
    company_name: "Neveu & Associés",
    last_contact_at: daysAgo(6),
    video_call_count: 1,
    emails_sent_count: 2,
    replies_count: 1,
  },
];

// Les objections reprennent celles des calls ci-dessus. « Équipe commerciale
// interne » est la plus mal traitée : c'est le constat que la démonstration
// doit rendre évident.
export const demoObjectionStats: ObjectionCategoryStat[] = [
  {
    categoryId: "demo-cat-1",
    label: "Équipe commerciale interne existante",
    description: "Le prospect estime que ses commerciaux couvrent déjà le besoin.",
    handlingGuidance:
      "Ne pas opposer les deux : vos commerciaux closent, nous remplissons leur agenda. Chiffrer le nombre de rendez-vous qualifiés obtenus aujourd'hui.",
    occurrences: 7,
    wellHandled: 1,
    partiallyHandled: 2,
    notHandled: 4,
    unevaluated: 0,
    commercialsCount: 3,
    wonCount: 1,
    lostCount: 4,
  },
  {
    categoryId: "demo-cat-2",
    label: "Budget trésorerie trop serré",
    description: "Le budget n'est pas arbitré, ou l'enveloppe est déjà engagée.",
    handlingGuidance:
      "Retourner l'objection : si la contrainte revient chaque année, c'est le signe d'un manque structurel d'acquisition, pas d'un problème ponctuel.",
    occurrences: 5,
    wellHandled: 3,
    partiallyHandled: 1,
    notHandled: 1,
    unevaluated: 0,
    commercialsCount: 3,
    wonCount: 3,
    lostCount: 1,
  },
  {
    categoryId: "demo-cat-3",
    label: "Mauvaise expérience passée en externalisation",
    description: "Un prestataire précédent a livré des rendez-vous hors cible.",
    handlingGuidance:
      "Reconnaître l'enjeu, puis proposer un test court avec dénonciation à J-7 et des critères de ciblage contractualisés.",
    occurrences: 4,
    wellHandled: 3,
    partiallyHandled: 1,
    notHandled: 0,
    unevaluated: 0,
    commercialsCount: 2,
    wonCount: 2,
    lostCount: 1,
  },
  {
    categoryId: "demo-cat-4",
    label: "Validation par un associé",
    description: "La décision ne peut pas être prise seul.",
    handlingGuidance: "",
    occurrences: 3,
    wellHandled: 1,
    partiallyHandled: 1,
    notHandled: 1,
    unevaluated: 0,
    commercialsCount: 2,
    wonCount: 1,
    lostCount: 1,
  },
  {
    categoryId: null,
    label: "Non classées",
    description: "Objections qu'aucune catégorie du playbook ne couvre.",
    handlingGuidance: "",
    occurrences: 2,
    wellHandled: 0,
    partiallyHandled: 0,
    notHandled: 0,
    unevaluated: 2,
    commercialsCount: 1,
    wonCount: 0,
    lostCount: 0,
  },
];
