import { DEAL_MEMORY_FIELDS, INACTIVITY_DAYS } from "./deal-memory-schema";

// Les règles des deals d'une organisation, réglables par le manager (réponse
// 8 de Hubert : le manager doit pouvoir modifier les règles lui-même ; réponse
// 6 : Brief suit la méthode de qualification du client ; question 9 : des
// critères de passage par étape, indicatifs). Migration 036,
// `organizations.deal_rules`. Sans dépendance : importé par l'écran et testé.

export const QUALIFICATION_KEYS = [
  "douleur",
  "impact",
  "decideur",
  "champion",
  "criteres",
  "processus",
  "budget",
  "echeance",
  "concurrents",
] as const;

export type QualificationKey = (typeof QUALIFICATION_KEYS)[number];

export type QualificationMethod = "socle" | "meddic" | "bant" | "meddpicc";

// Ce que chaque méthode demande de savoir, dans les champs de la fiche.
// MEDDPICC : le « Paper process » (circuit de signature) n'a pas de champ
// dédié, il se lit dans le processus de décision ; « Competition » = les
// concurrents évoqués.
export const METHODS: Record<QualificationMethod, { label: string; fields: QualificationKey[] }> = {
  socle: {
    label: "Socle Brief + MEDDIC (par défaut)",
    fields: ["douleur", "impact", "decideur", "champion", "criteres", "processus", "budget", "echeance"],
  },
  meddic: { label: "MEDDIC", fields: ["impact", "decideur", "criteres", "processus", "douleur", "champion"] },
  bant: { label: "BANT", fields: ["budget", "decideur", "douleur", "echeance"] },
  meddpicc: {
    label: "MEDDPICC",
    fields: ["impact", "decideur", "criteres", "processus", "douleur", "champion", "concurrents"],
  },
};

export const MAX_STAGES = 6;

export type DealRules = {
  method: QualificationMethod;
  // Jours sans call au-delà desquels un deal est à relancer.
  inactivityDays: number;
  // « Étape plus longue que d'habitude » : au-delà de ce multiple de la durée
  // habituelle d'une étape.
  slowStageFactor: number;
  // Les objectifs par étape commerciale (réponse d'Hubert à E1, validée par
  // Jean le 14/11/2026) : ce que le commercial doit obtenir PENDANT l'étape n
  // (1 = première étape du pipeline HubSpot ; hors HubSpot, les trois étapes
  // par défaut). Ce qui est confirmé reste acquis ; ce qui manque d'une étape
  // passée est reporté, et lève l'alerte « critère de passage manquant ».
  // Avant le 14/11/2026 les objectifs suivaient le numéro du rendez-vous
  // (`callObjectives`, abandonné : une valeur enregistrée est ignorée).
  stageRequirements: Partial<Record<number, QualificationKey[]>>;
};

// Hors HubSpot : trois étapes, le R1 dans la première, le R2 dans la
// deuxième, la suite dans la troisième.
export const DEFAULT_STAGE_LABELS = ["Qualification", "Évaluation", "Proposition"] as const;

// L'étape où en est un deal pour ses objectifs : celle du pipeline HubSpot
// quand il y est ouvert, sinon son rang ramené aux trois étapes par défaut.
export function stageLevel(hubspot: { closed: boolean; stageIndex: number | null } | null | undefined, rank: number): number {
  if (hubspot && !hubspot.closed && hubspot.stageIndex) return Math.min(hubspot.stageIndex, MAX_STAGES);
  return Math.max(1, Math.min(rank, DEFAULT_STAGE_LABELS.length));
}

// L'exemple d'Hubert (13/11/2026) : Qualification → besoin, impact, décideur,
// calendrier ; Évaluation → critères, budget, processus de validation ;
// Proposition → les parties prenantes (l'allié chez le client).
export const DEFAULT_RULES: DealRules = {
  method: "socle",
  inactivityDays: INACTIVITY_DAYS,
  slowStageFactor: 1.5,
  stageRequirements: {
    1: ["douleur", "impact", "decideur", "echeance"],
    2: ["criteres", "budget", "processus"],
    3: ["champion"],
  },
};

const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));

export function qualificationLabel(key: QualificationKey): string {
  return FIELD_LABELS.get(key) ?? key;
}

export function qualificationFields(rules: DealRules): QualificationKey[] {
  return METHODS[rules.method].fields;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// Une valeur venue de la base ou d'un formulaire, ramenée à des règles
// complètes et sûres.
export function coerceDealRules(raw: unknown): DealRules {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof DealRules, unknown>>;
  const method = typeof source.method === "string" && source.method in METHODS ? (source.method as QualificationMethod) : DEFAULT_RULES.method;
  const rawStages = source.stageRequirements && typeof source.stageRequirements === "object" ? (source.stageRequirements as Record<string, unknown>) : null;
  return {
    method,
    inactivityDays: Math.round(clamp(source.inactivityDays, 3, 90, DEFAULT_RULES.inactivityDays)),
    slowStageFactor: Math.round(clamp(source.slowStageFactor, 1, 5, DEFAULT_RULES.slowStageFactor) * 10) / 10,
    stageRequirements: rawStages ? keysByNumber(rawStages, MAX_STAGES) : DEFAULT_RULES.stageRequirements,
  };
}

// { "1": ["budget", …], … } : des listes de champs connus, sans doublon, de 1
// à `max`.
function keysByNumber(raw: Record<string, unknown>, max: number): Partial<Record<number, QualificationKey[]>> {
  const result: Partial<Record<number, QualificationKey[]>> = {};
  for (let n = 1; n <= max; n++) {
    const list = raw[String(n)];
    if (!Array.isArray(list)) continue;
    const keys = [...new Set(list.filter((k): k is QualificationKey => typeof k === "string" && (QUALIFICATION_KEYS as readonly string[]).includes(k)))];
    if (keys.length > 0) result[n] = keys;
  }
  return result;
}

// Ce qui devrait être connu en arrivant à l'étape `stage` et ne l'est pas :
// les objectifs des étapes PRÉCÉDENTES, limités aux champs de la méthode.
export function missingForStage(rules: DealRules, stage: number | null, known: Set<string>): QualificationKey[] {
  if (!stage || stage < 1) return [];
  const fields = new Set(qualificationFields(rules));
  const required = new Set<QualificationKey>();
  for (let s = 1; s < Math.min(stage, MAX_STAGES + 1); s++) for (const k of rules.stageRequirements[s] ?? []) if (fields.has(k)) required.add(k);
  return [...required].filter((k) => !known.has(k));
}
