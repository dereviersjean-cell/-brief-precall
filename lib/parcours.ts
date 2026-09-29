import { MODULES, type ModuleKey } from "./modules";

// Où en est un client dans son parcours de 8 semaines (document « Brief —
// Parcours client type »). Sans dépendance : testé directement
// (tests/parcours.test.ts), utilisé par l'espace « Suivi clients » de l'admin.

export const PARCOURS_LAST_WEEK = 8;

export type ParcoursState = {
  // Semaine en cours, de 0 (mise en route) à 8 (bilan) ; au-delà, le parcours
  // est terminé et la valeur reste 8. Null = pas de date de début.
  week: number | null;
  finished: boolean;
  // Prochain module du parcours pas encore ouvert, dans l'ordre des semaines.
  // Réduit à ce qui s'affiche : la définition complète porte des RegExp
  // (chemins du module), que Next refuse de transmettre d'un composant
  // serveur à un composant client — la page Clients plantait dès que le
  // prochain module était « Emails de suivi » (29/09/2026).
  nextModule: { key: ModuleKey; label: string; week: number | null } | null;
  // Le prochain module aurait déjà dû être ouvert : sa semaine est passée.
  late: boolean;
  openCount: number;
  totalCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeParcours(
  startedAt: string | null,
  enabled: readonly ModuleKey[],
  now: Date = new Date()
): ParcoursState {
  const parcoursModules = MODULES.filter((m) => m.week !== null).sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
  const next = parcoursModules.find((m) => !enabled.includes(m.key));
  const nextModule = next ? { key: next.key, label: next.label, week: next.week } : null;

  let week: number | null = null;
  let finished = false;
  if (startedAt) {
    const start = new Date(`${startedAt.slice(0, 10)}T00:00:00`);
    const elapsedWeeks = Math.floor((now.getTime() - start.getTime()) / (7 * DAY_MS));
    week = Math.min(PARCOURS_LAST_WEEK, Math.max(0, elapsedWeeks));
    finished = elapsedWeeks > PARCOURS_LAST_WEEK;
  }

  return {
    week,
    finished,
    nextModule,
    late: week !== null && nextModule !== null && (nextModule.week ?? 0) < week,
    openCount: enabled.length,
    totalCount: MODULES.length,
  };
}

// ─── Rapport de préparation du point hebdomadaire ───────────────────────────
// Les étapes du parcours telles que le document les décrit : ce qu'on montre
// au client avec ses données, et le critère pour passer à la suite. Règle du
// parcours : un module ne s'ouvre que si l'étape précédente sert — sinon la
// semaine sert à débloquer plutôt qu'à empiler.

export type ParcoursStep = {
  week: number;
  title: string;
  // Ce qu'on montre pendant le point, avec ses données.
  show: string;
  // Critère pour passer à l'étape suivante.
  criterion: string;
  // Modules à ouvrir à cette étape ; vide = socle, rien à activer.
  modules: ModuleKey[];
};

export const PARCOURS_STEPS: ParcoursStep[] = [
  {
    week: 0,
    title: "Mise en route",
    show: "La liste de ses prochains rendez-vous, déjà repérés dans son agenda.",
    criterion: "Tous les commerciaux connectés, tous les agendas reliés.",
    modules: [],
  },
  {
    week: 1,
    title: "Briefs avant rendez-vous",
    show: "Deux ou trois briefs sur ses vrais prospects de la semaine.",
    criterion: "Chaque commercial a au moins un brief.",
    modules: [],
  },
  {
    week: 2,
    title: "Analyse des calls",
    show: "Les premiers scores de l'équipe et un call exemplaire à réécouter.",
    criterion: "Au moins 5 calls analysés.",
    modules: [],
  },
  {
    week: 3,
    title: "Playbook",
    show: "Sa grille, construite avec le manager à partir de ses propres critères.",
    criterion: "Grille validée par le manager.",
    modules: ["playbook"],
  },
  {
    week: 4,
    title: "Emails de suivi",
    show: "L'email rédigé après chacun de ses calls, dans son ton.",
    criterion: "Premiers emails envoyés depuis Brief.",
    modules: ["follow_up"],
  },
  {
    week: 5,
    title: "Objections",
    show: "Les objections de ses prospects, avec leurs phrases exactes.",
    criterion: "Réponses écrites pour ses 3 objections les plus fréquentes.",
    modules: ["objections"],
  },
  {
    week: 6,
    title: "CRM et tâches",
    show: "Les notes et tâches qui arrivent seules dans HubSpot ou Pipedrive.",
    criterion: "CRM connecté, premières notes visibles.",
    modules: ["crm", "tasks"],
  },
  {
    week: 7,
    title: "Entraînement",
    show: "Ses commerciaux qui s'exercent sur ses vraies objections.",
    criterion: "Une session par commercial.",
    modules: ["training"],
  },
  {
    week: 8,
    title: "Vue manager et bilan",
    show: "Où l'équipe tient et où elle lâche, avant et après.",
    criterion: "Décision : abonnement et rythme du suivi.",
    modules: ["insights", "weekly_digest"],
  },
];

// L'étape à présenter au prochain point : celle de la semaine où il tombe,
// sauf si un module d'une étape antérieure n'est toujours pas ouvert — on ne
// saute pas d'étape. `gate` = l'étape précédente, dont le critère dit si on
// peut avancer.
export function stepsForReview(
  reviewWeek: number,
  nextModuleWeek: number | null
): { present: ParcoursStep; gate: ParcoursStep | null } {
  const week = Math.min(Math.max(0, reviewWeek), nextModuleWeek ?? PARCOURS_LAST_WEEK, PARCOURS_LAST_WEEK);
  return {
    present: PARCOURS_STEPS[week],
    gate: week > 0 ? PARCOURS_STEPS[week - 1] : null,
  };
}

export type CriterionMember = {
  label: string;
  role: "manager" | "commercial" | null;
  status: "active" | "invited";
  agenda: "connected" | "disconnected" | "missing";
  briefs: number;
  trainingSessions: number;
};

export type CriterionInput = {
  members: CriterionMember[];
  analyzedCalls: number;
  playbookDefined: boolean;
  followUpsSent: number;
  // Les 3 catégories d'objections les plus fréquentes, avec ou sans réponse
  // attendue écrite.
  topObjections: { label: string; answered: boolean }[];
  crmConnected: boolean;
};

export type CriterionResult = {
  // « manual » : rien à mesurer, c'est une décision prise pendant le point.
  status: "met" | "unmet" | "manual";
  detail: string;
  // Ce qu'il manque, nommément : c'est l'action de la semaine suivante.
  missing: string[];
};

const ANALYZED_CALLS_TARGET = 5;

// Les critères portent sur les commerciaux ; une équipe sans commercial
// déclaré (un manager seul qui fait ses rendez-vous) est jugée sur ses membres.
function salesPeople(members: CriterionMember[]): CriterionMember[] {
  const active = members.filter((m) => m.status === "active");
  const commercials = active.filter((m) => m.role === "commercial");
  return commercials.length > 0 ? commercials : active;
}

export function evaluateCriterion(week: number, input: CriterionInput): CriterionResult {
  switch (week) {
    case 0: {
      const invited = input.members.filter((m) => m.status === "invited");
      const active = input.members.filter((m) => m.status === "active");
      const missing = [
        ...invited.map((m) => `${m.label} n'a pas encore accepté son invitation`),
        ...active.filter((m) => m.agenda === "missing").map((m) => `${m.label} n'a pas branché son agenda`),
        ...active.filter((m) => m.agenda === "disconnected").map((m) => `L'agenda de ${m.label} est coupé`),
      ];
      const linked = active.filter((m) => m.agenda === "connected").length;
      return {
        status: input.members.length > 0 && missing.length === 0 ? "met" : "unmet",
        detail:
          input.members.length === 0
            ? "Aucun membre pour l'instant."
            : `${active.length} membre${active.length > 1 ? "s" : ""} sur ${input.members.length} connecté${active.length > 1 ? "s" : ""}, ${linked} agenda${linked > 1 ? "s" : ""} relié${linked > 1 ? "s" : ""}.`,
        missing,
      };
    }
    case 1: {
      const people = salesPeople(input.members);
      const without = people.filter((m) => m.briefs === 0);
      return {
        status: people.length > 0 && without.length === 0 ? "met" : "unmet",
        detail: `${people.length - without.length} commercial${people.length - without.length > 1 ? "aux" : ""} sur ${people.length} avec au moins un brief.`,
        missing: without.map((m) => `${m.label} n'a encore aucun brief`),
      };
    }
    case 2: {
      const remaining = Math.max(0, ANALYZED_CALLS_TARGET - input.analyzedCalls);
      return {
        status: remaining === 0 ? "met" : "unmet",
        detail: `${input.analyzedCalls} call${input.analyzedCalls > 1 ? "s" : ""} analysé${input.analyzedCalls > 1 ? "s" : ""} sur ${ANALYZED_CALLS_TARGET}.`,
        missing: remaining > 0 ? [`Encore ${remaining} call${remaining > 1 ? "s" : ""} à enregistrer`] : [],
      };
    }
    case 3:
      return input.playbookDefined
        ? { status: "met", detail: "Grille enregistrée.", missing: [] }
        : {
            status: "unmet",
            detail: "Aucune grille : les calls sont notés sur la grille par défaut.",
            missing: ["Construire la grille avec le manager"],
          };
    case 4:
      return {
        status: input.followUpsSent > 0 ? "met" : "unmet",
        detail: `${input.followUpsSent} email${input.followUpsSent > 1 ? "s" : ""} de suivi envoyé${input.followUpsSent > 1 ? "s" : ""} depuis Brief.`,
        missing: input.followUpsSent > 0 ? [] : ["Envoyer un premier email de suivi depuis Brief"],
      };
    case 5: {
      if (input.topObjections.length === 0) {
        return { status: "unmet", detail: "Aucune objection classée pour l'instant.", missing: ["Définir les catégories d'objections"] };
      }
      const unanswered = input.topObjections.filter((o) => !o.answered);
      return {
        status: unanswered.length === 0 ? "met" : "unmet",
        detail: `${input.topObjections.length - unanswered.length} sur ${input.topObjections.length} objections fréquentes ont leur réponse écrite.`,
        missing: unanswered.map((o) => `Écrire la réponse attendue pour « ${o.label} »`),
      };
    }
    case 6:
      return input.crmConnected
        ? { status: "met", detail: "CRM connecté.", missing: [] }
        : { status: "unmet", detail: "Aucun CRM connecté.", missing: ["Connecter HubSpot ou Pipedrive"] };
    case 7: {
      const people = salesPeople(input.members);
      const without = people.filter((m) => m.trainingSessions === 0);
      return {
        status: people.length > 0 && without.length === 0 ? "met" : "unmet",
        detail:
          people.length - without.length > 1
            ? `${people.length - without.length} commerciaux sur ${people.length} se sont entraînés.`
            : `${people.length - without.length} commercial sur ${people.length} s'est entraîné.`,
        missing: without.map((m) => `${m.label} ne s'est pas encore entraîné`),
      };
    }
    default:
      return { status: "manual", detail: "À décider pendant le point : abonnement et rythme du suivi.", missing: [] };
  }
}
