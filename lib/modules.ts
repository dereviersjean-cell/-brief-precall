// Modules activables par organisation — le parcours client (document
// « Brief — Parcours client type », 29/09/2026).
//
// Brief se vend comme un accompagnement : à chaque point hebdomadaire,
// l'account manager active un module déjà construit. Un module désactivé est
// INVISIBLE (ni menu, ni page, ni API) : le client le découvre le jour où on
// le lui ouvre, déjà rempli de ses données — les traitements de fond
// (analyse, emails rédigés, objections indexées) tournent quel que soit
// l'état du module ; seuls l'affichage et ce qui SORT de Brief (notes CRM,
// Slack, bilans par email, tâches) en dépendent.
//
// Le socle n'est pas ici et ne se désactive pas : connexion, agenda,
// enregistrement, briefs avant rendez-vous, analyse des calls — le produit
// d'appel.
//
// Aucune dépendance : importé par le middleware, les routes serveur et les
// composants client.

export type ModuleKey =
  | "playbook"
  | "follow_up"
  | "objections"
  | "crm"
  | "tasks"
  | "training"
  | "insights"
  | "weekly_digest"
  | "slack"
  | "references";

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  description: string;
  // Semaine du parcours où le module est présenté ; null = à la demande.
  week: number | null;
  // Préfixes de chemins (pages et API) qui n'existent que si le module est
  // actif. Un chemin peut relever de plusieurs modules : il faut alors qu'ils
  // soient tous actifs.
  paths: string[];
  // Chemins qui ne se décrivent pas par un préfixe.
  patterns?: RegExp[];
};

export const MODULES: ModuleDefinition[] = [
  {
    key: "playbook",
    label: "Playbook",
    description: "Grille de notation des calls, construite avec le manager.",
    week: 3,
    paths: ["/dashboard/playbook", "/team/playbook", "/api/playbook"],
  },
  {
    key: "follow_up",
    label: "Emails de suivi",
    description: "Email rédigé après chaque call, prêt à relire et envoyer.",
    week: 4,
    paths: [
      "/settings/email-templates",
      "/team/email-templates",
      "/api/email-templates",
      "/api/feedback/send-follow-up",
      "/api/feedback/send-reply",
    ],
    patterns: [/^\/api\/feedback\/[^/]+\/follow-up(\/|$)/],
  },
  {
    key: "objections",
    label: "Objections",
    description: "Objections repérées dans les calls, phrases exactes, réponses du playbook.",
    week: 5,
    paths: ["/dashboard/objections", "/settings/objections", "/settings/calibrage", "/api/objections"],
  },
  {
    key: "crm",
    label: "CRM",
    description: "Notes et tâches poussées dans HubSpot ou Pipedrive.",
    week: 6,
    paths: ["/api/crm"],
  },
  {
    key: "tasks",
    label: "Tâches",
    description: "Tâches créées après chaque call, emails de relance.",
    week: 6,
    paths: ["/tasks", "/api/tasks"],
  },
  {
    key: "training",
    label: "Entraînement",
    description: "Exercices sur les vraies objections des prospects.",
    week: 7,
    paths: ["/training", "/api/training"],
  },
  {
    key: "insights",
    label: "Vue manager",
    description: "Insights d'équipe et analytics : où l'équipe tient, où elle lâche.",
    week: 8,
    paths: ["/team/insights", "/dashboard/analytics"],
  },
  {
    key: "weekly_digest",
    label: "Bilan hebdo",
    description: "Résumé de la semaine par email, commercial et manager.",
    week: 8,
    paths: ["/api/digest-preferences"],
  },
  {
    key: "slack",
    label: "Slack",
    description: "Briefs et analyses en message privé sur Slack.",
    week: null,
    paths: ["/api/slack"],
  },
  {
    key: "references",
    label: "Références clients",
    description: "Cas clients proches cités dans les briefs.",
    week: null,
    paths: [
      "/settings/references",
      "/api/client-references",
      "/api/crm/hubspot/import-references",
      "/api/crm/pipedrive/import-references",
    ],
  },
];

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === "string" && (ALL_MODULE_KEYS as string[]).includes(value);
}

// Modules actifs d'une organisation, depuis sa ligne `organizations`.
//
// `enabled_modules` NULL = organisation antérieure au parcours (Oliverlist) :
// tout reste actif, comme avant — sauf Entraînement, qui suit l'ancien
// interrupteur `training_enabled`. Dès que l'account manager règle les
// modules d'une organisation, la liste devient explicite et fait seule foi.
// Pas d'organisation (compte isolé) : tout est actif.
export function resolveEnabledModules(
  org: { enabled_modules?: string[] | null; training_enabled?: boolean | null } | null | undefined
): ModuleKey[] {
  if (!org) return [...ALL_MODULE_KEYS];
  if (Array.isArray(org.enabled_modules)) return org.enabled_modules.filter(isModuleKey);
  return ALL_MODULE_KEYS.filter((key) => key !== "training" || org.training_enabled === true);
}

function startsWithSegment(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Modules dont dépend un chemin (page ou API). Vide = socle, toujours ouvert.
export function modulesForPath(pathname: string): ModuleKey[] {
  return MODULES.filter(
    (m) => m.paths.some((p) => startsWithSegment(pathname, p)) || (m.patterns ?? []).some((re) => re.test(pathname))
  ).map((m) => m.key);
}

// Le premier module désactivé qui ferme ce chemin, ou null s'il est ouvert.
export function blockingModuleForPath(pathname: string, enabled: readonly ModuleKey[]): ModuleKey | null {
  return modulesForPath(pathname).find((key) => !enabled.includes(key)) ?? null;
}
