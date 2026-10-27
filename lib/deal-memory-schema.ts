// Fiche deal tirée d'un call — chantier Deal Execution, étape 1 (26/10/2026).
// Détail des décisions : docs/deal-execution/README.md.
//
// Ce module ne porte que la forme de la fiche (champs, alertes, libellés).
// Sans aucune dépendance : il est importé par l'écran (composant client), et
// la moindre importation de lib/objection-classifier y tirerait le SDK
// Anthropic (cf. bug #12). La génération vit dans lib/deal-memory.ts.

// Les champs de la mémoire d'un deal validés avec Jean le 26/10/2026 : le
// socle discuté + les champs MEDDIC de l'article envoyé par Hubert. Le
// douzième, « Objections », n'est pas ici : il est lu dans call_objections,
// déjà classées et notées par le pipeline existant — deux sources pour la
// même chose finiraient par se contredire.
export const DEAL_MEMORY_FIELDS = [
  {
    key: "douleur",
    label: "Douleur identifiée",
    meddic: "Identified Pain",
    definition: "le problème concret que le prospect cherche à résoudre, avec ses mots",
  },
  {
    key: "impact",
    label: "Impact chiffré / ROI attendu",
    meddic: "Metrics",
    definition:
      "ce que le problème coûte au prospect ou ce que la solution lui rapporterait, chiffré quand il donne un chiffre (temps, argent, volume, effectif)",
  },
  {
    key: "decideur",
    label: "Décideur économique",
    meddic: "Economic Buyer",
    definition: "la personne qui décide et engage le budget côté prospect : nom et fonction",
  },
  {
    key: "champion",
    label: "Champion",
    meddic: "Champion",
    definition: "la personne qui, côté prospect, pousse le projet en interne",
  },
  {
    key: "criteres",
    label: "Critères de décision",
    meddic: "Decision Criteria",
    definition: "ce sur quoi le prospect va comparer et choisir",
  },
  {
    key: "processus",
    label: "Processus de décision",
    meddic: "Decision Process",
    definition: "les étapes, les personnes et les délais de la décision côté prospect",
  },
  {
    key: "budget",
    label: "Budget",
    meddic: null,
    definition: "l'enveloppe, la fourchette ou la contrainte budgétaire exprimée",
  },
  {
    key: "echeance",
    label: "Échéance",
    meddic: null,
    definition: "la date ou le délai visé pour décider ou démarrer",
  },
  {
    key: "concurrents",
    label: "Concurrents évoqués",
    meddic: null,
    definition:
      "les concurrents ou alternatives évoqués, y compris faire en interne ou ne rien faire",
  },
  {
    key: "prochaines_etapes",
    label: "Engagements et prochaines étapes",
    meddic: null,
    definition:
      "ce que chaque partie s'est engagée à faire après le call, avec la date quand elle a été fixée",
  },
  {
    key: "interlocuteurs_manquants",
    label: "Interlocuteurs manquants",
    meddic: null,
    definition:
      "les personnes à faire entrer dans la discussion qui n'étaient pas là (finance, associé, DSI…)",
  },
] as const;

export type DealMemoryFieldKey = (typeof DEAL_MEMORY_FIELDS)[number]["key"];

// Alertes que le contenu d'un seul call permet de lever. Celles qui dépendent
// du deal dans le temps (jours sans activité, durée à une étape, sentiment en
// baisse d'un call à l'autre) attendent l'étape 2 et HubSpot.
export const DEAL_ALERT_RULES = [
  {
    key: "concurrent_evoque",
    label: "Concurrent évoqué",
    definition: "le prospect cite un concurrent ou une solution alternative, y compris faire en interne",
    // Une absence ne se cite pas : seules les règles qui en constatent une
    // (needsQuote: false) peuvent se passer d'une phrase du transcript.
    needsQuote: true,
    needsHistory: false,
  },
  {
    key: "objection_cachee",
    label: "Objection cachée",
    definition:
      "une réticence exprimée à demi-mot (hésitation, réserve, « on verra »), jamais formulée clairement ni traitée par le commercial",
    needsQuote: true,
    needsHistory: false,
  },
  {
    key: "preuve_sociale",
    label: "Besoin de preuve sociale",
    definition:
      "le prospect demande des références, des cas clients ou des retours d'expérience, ou doute que des entreprises comparables l'utilisent",
    needsQuote: true,
    needsHistory: false,
  },
  {
    key: "interlocuteur_manquant",
    label: "Interlocuteur à faire entrer",
    definition:
      "une personne qui pèse dans la décision (finance, associé, cofondateur, DSI…) n'a pas participé et devra être impliquée ; si c'est le décideur lui-même, utilise decideur_absent",
    needsQuote: true,
    needsHistory: false,
  },
  {
    key: "decideur_absent",
    label: "Décideur absent",
    definition: "la personne qui décide n'était pas dans le call, ou personne n'a pu dire qui décide",
    needsQuote: false,
    needsHistory: false,
  },
  {
    key: "prochaine_etape_non_datee",
    label: "Pas de prochaine étape datée",
    definition: "le call se termine sans prochaine étape concrète ET datée (un « je reviens vers vous » ne compte pas)",
    needsQuote: false,
    needsHistory: false,
  },
  // Alertes qui comparent ce call aux précédents du même deal (étape 2,
  // 27/10/2026) : levées seulement quand le deal a déjà un historique.
  {
    key: "objection_recurrente",
    label: "Objection qui revient",
    definition:
      "une objection déjà soulevée lors d'un call précédent du deal revient dans ce call, sans avoir été levée entre-temps",
    needsQuote: true,
    needsHistory: true,
  },
  {
    key: "decideur_toujours_absent",
    label: "Décideur toujours pas rencontré",
    definition:
      "à ce stade du deal (deuxième call ou plus), la personne qui décide n'a toujours participé à aucun call",
    needsQuote: false,
    needsHistory: true,
  },
  {
    key: "sentiment_en_baisse",
    label: "Prospect moins engagé",
    definition:
      "le prospect se montre nettement moins engagé qu'au call précédent : plus de réserves, moins de projection, engagements revus à la baisse",
    needsQuote: true,
    needsHistory: true,
  },
] as const;

// Levée à l'affichage, d'après la date du dernier call du deal (règle « aucune
// activité depuis X jours ») : seuil par défaut, réglable par client plus tard.
export const INACTIVITY_DAYS = 14;

export type DealAlertRuleKey = (typeof DEAL_ALERT_RULES)[number]["key"];

// Levée par le code à partir des objections déjà notées, pas par le modèle.
export const OBJECTION_ALERT_LABEL = "Objection mal traitée";

// Un passage cité, découpé par interlocuteur : une citation qui passe d'une
// personne à l'autre doit dire qui parle (constaté sur le call d'Antoine, où
// la phrase de Katell se lisait comme celle du prospect).
export type QuoteSegment = { speaker: string | null; text: string };

export type DealMemoryItem = {
  text: string;
  // Engagements et prochaines étapes seulement (27/10/2026) : la date convenue
  // pour cette action, AAAA-MM-JJ, ou null si aucune date n'a été fixée.
  // Absent (undefined) des fiches générées avant : la date n'a pas été relevée.
  date?: string | null;
  // Phrase exacte du transcript qui justifie l'élément, extraite par le code.
  verbatim: string | null;
  // Absent des fiches générées avant le 27/10/2026 : l'écran retombe alors
  // sur `verbatim`.
  quote?: QuoteSegment[];
  startMs: number | null;
};

export type DealMemoryAlert = {
  rule: DealAlertRuleKey;
  text: string;
  verbatim: string | null;
  quote?: QuoteSegment[];
  startMs: number | null;
};

export type DealMemoryContent = {
  fields: Partial<Record<DealMemoryFieldKey, DealMemoryItem[]>>;
  alerts: DealMemoryAlert[];
};

export type StoredDealMemory = DealMemoryContent & {
  model: string | null;
  generatedAt: string;
  // Dernier envoi dans HubSpot (étape 3), absent si jamais envoyée.
  hubspotPushedAt?: string | null;
};

// Ce qu'un deal a retenu de ses calls précédents, donné au modèle pour qu'il
// compare (objection qui revient, décideur toujours absent…).
export type DealHistoryEntry = { callAt: string; title: string | null; content: DealMemoryContent };

// Ce que Brief a lu du deal HubSpot rattaché (étape 3), relu à chaque fiche.
export type HubspotDealSnapshot = {
  id: string;
  name: string | null;
  pipeline: string | null;
  stage: string | null;
  // Position de l'étape dans le pipeline, 1 = la première ; null si l'étape
  // n'est pas trouvée dans le pipeline (supprimée depuis, par exemple).
  stageIndex: number | null;
  stageCount: number | null;
  closed: boolean;
  amount: number | null;
  closeDate: string | null;
  nextStep: string | null;
  url: string | null;
  // Étape 6 (27/10/2026) : de quoi situer le deal dans les statistiques du
  // pipeline (lib/deal-pipeline-stats.ts). Absents des photos antérieures.
  pipelineId?: string | null;
  stageId?: string | null;
  // Entrée dans l'étape actuelle, d'après l'historique HubSpot.
  stageEnteredAt?: string | null;
};

// Le deal tel que l'écran d'un call le montre.
export type DealOverview = {
  id: string;
  name: string;
  hubspot: HubspotDealSnapshot | null;
  calls: { callId: string; callAt: string | null; title: string | null; alertCount: number; isCurrent: boolean }[];
  // Jours écoulés depuis le dernier call du deal, calculés à la lecture.
  idleDays: number | null;
  // Chaque champ, tous calls confondus, du plus récent au plus ancien.
  memory: Partial<Record<DealMemoryFieldKey, (DealMemoryItem & { callId: string; callAt: string | null })[]>>;
};
