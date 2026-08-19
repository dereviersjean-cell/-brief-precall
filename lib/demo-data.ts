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

import type { DimensionRow } from "@/app/dashboard/DimensionScores";
import type { CallWithAnalysis, Playbook, TeamAnalytics } from "./db";

// Les dimensions reprennent celles du playbook ci-dessous, et leurs moyennes
// concordent avec les objections : « Objections » est la plus faible parce que
// c'est là que Camille perd des deals.
export const demoDimensions: DimensionRow[] = [
  { key: "decouverte", label: "Découverte du besoin", average: 4.1 },
  { key: "qualification", label: "Qualification", average: 3.6 },
  { key: "objections", label: "Traitement des objections", average: 2.4 },
  { key: "closing", label: "Engagement et prochaine étape", average: 3.0 },
];

export const demoPlaybook: Playbook = {
  id: "demo-playbook",
  organization_id: "demo-org",
  name: "Playbook commercial — Oliverlist",
  created_by: null,
  created_at: daysAgo(120),
  updated_at: daysAgo(12),
  dimensions: [
    ["decouverte", "Découverte du besoin", 3, "Comprendre la situation actuelle avant de proposer quoi que ce soit.", [
      "Le problème actuel est-il chiffré (temps, argent, deals perdus) ?",
      "A-t-on identifié ce qui a déclenché la prise de rendez-vous ?",
    ]],
    ["qualification", "Qualification", 2, "S'assurer que l'affaire peut se conclure.", [
      "Le budget est-il évoqué et arbitré ?",
      "Le décideur final est-il identifié et présent ?",
      "Une échéance est-elle posée ?",
    ]],
    ["objections", "Traitement des objections", 3, "Chaque réticence traitée selon la méthode définie, pas esquivée.", [
      "Chaque objection a-t-elle reçu une réponse ?",
      "La réponse suit-elle la méthode du playbook d'objections ?",
    ]],
    ["closing", "Engagement et prochaine étape", 2, "Ne jamais terminer sans une suite datée.", [
      "Une prochaine étape précise est-elle posée ?",
      "Est-elle datée et engageante pour les deux parties ?",
    ]],
  ].map(([key, label, weight, description, questions], i) => ({
    id: `demo-dim-${i}`,
    playbook_id: "demo-playbook",
    key: key as string,
    label: label as string,
    description: description as string,
    weight: weight as number,
    sort_order: i,
    created_at: daysAgo(120),
    criteria: (questions as string[]).map((question, j) => ({
      id: `demo-crit-${i}-${j}`,
      dimension_id: `demo-dim-${i}`,
      question,
      sort_order: j,
      created_at: daysAgo(120),
    })),
  })),
};

// Quatre commerciaux : un exemple à un seul commercial ne montrerait pas
// l'intérêt de la comparaison, qui est tout le propos de cet onglet.
export const demoTeamAnalytics: TeamAnalytics = {
  periodWeeks: 12,
  commercials: [
    ["demo-u1", "Camille Roussel", 62, 109_000, 46_000, 4.4, 1_050, 17.3, 24, 27 * 60],
    ["demo-u2", "Farid Benali", 48, 71_000, 88_000, 6.8, 1_900, 21.6, 31, 32 * 60],
    ["demo-u3", "Léa Marchand", 44, 64_000, 96_000, 7.4, 2_300, 24.1, 28, 35 * 60],
    ["demo-u4", "Tom Aubert", 71, 168_000, 31_000, 2.9, 600, 9.8, 19, 22 * 60],
  ].map(([userId, name, ratio, monologue, story, interactivity, patience, questions, calls, avgSec]) => ({
    userId: userId as string,
    name: name as string,
    email: `${(name as string).toLowerCase().replace(/[^a-z]/g, ".")}@exemple.fr`,
    callsCount: calls as number,
    totalDurationSeconds: (calls as number) * (avgSec as number),
    avgDurationSeconds: avgSec as number,
    weeklyCallsVolume: (calls as number) / 12,
    weeklyDurationSeconds: ((calls as number) * (avgSec as number)) / 12,
    talkRatioPct: ratio as number,
    longestMonologueMs: monologue as number,
    longestProspectStoryMs: story as number,
    interactivityScore: interactivity as number,
    patienceMs: patience as number,
    questionRate: questions as number,
    analyzedCallsCount: calls as number,
  })),
  teamAverage: {
    callsCount: 102,
    totalDurationSeconds: 102 * 29 * 60,
    avgDurationSeconds: 29 * 60,
    weeklyCallsVolume: 8.5,
    weeklyDurationSeconds: (102 * 29 * 60) / 12,
    talkRatioPct: 56,
    longestMonologueMs: 103_000,
    longestProspectStoryMs: 65_250,
    interactivityScore: 5.4,
    patienceMs: 1_462,
    questionRate: 18.2,
    analyzedCallsCount: 102,
  },
};

function demoCall(
  id: string,
  company: string,
  email: string,
  days: number,
  score: number,
  sentiment: "positif" | "neutre" | "négatif",
  summary: string
): CallWithAnalysis {
  return {
    id,
    user_id: "demo-u1",
    contact_email: email,
    company_name: company,
    created_at: daysAgo(days),
    started_at: daysAgo(days),
    status: "done",
    duration_seconds: 27 * 60,
    participant_count: 2,
    follow_up_email: { subject: `Suite à notre échange — ${company}`, body: "…" },
    follow_up_sent_at: null,
    recall_bot_id: null,
    recording_id: null,
    meeting_title: `Rencontre Oliverlist <> ${company}`,
    meeting_stage: "r1",
    transcript: null,
    transcript_json: null,
    speaker_names_override: {},
    analysis: {
      id: `${id}-analysis`,
      scores: { global_score: score },
      strengths: [],
      weaknesses: [],
      objections: [],
      next_steps: [],
      summary,
      sentiment,
      playbook_snapshot: null,
      key_points: null,
      key_points_generated_at: null,
    },
  } as unknown as CallWithAnalysis;
}

export const demoCalls: CallWithAnalysis[] = [
  demoCall("demo-1", "Velbrun Capital", "a.ravachol@velbruncapital.fr", 1, 3.4, "positif", "Budget non arbitré avant septembre, décision partagée avec un associé."),
  demoCall("demo-2", "Groupe Marceau", "s.marceau@groupe-marceau.com", 3, 4.1, "positif", "Besoin clair et chiffré, second rendez-vous calé avec le directeur général."),
  demoCall("demo-3", "Atelier Fontaine", "contact@atelier-fontaine.fr", 4, 2.6, "négatif", "Objection « équipe interne » restée sans réponse, échange écourté."),
  demoCall("demo-4", "Neveu & Associés", "p.neveu@neveu-associes.fr", 6, 3.5, "neutre", "Mauvaise expérience passée évoquée, test d'un mois proposé."),
  demoCall("demo-5", "Cabinet Lantier", "j.lantier@cabinet-lantier.fr", 8, 2.9, "neutre", "Deux concurrents consultés en parallèle, décision fin de mois."),
];
