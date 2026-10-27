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
  // Ce qui doit être connu quand le deal atteint l'étape n (1 = première
  // étape du pipeline HubSpot, ou R1 hors HubSpot). Cumulatif : à l'étape 3,
  // ce que demandent les étapes 1, 2 et 3.
  stageRequirements: Partial<Record<number, QualificationKey[]>>;
};

// Les exigences par étape de l'article envoyé par Hubert : Découverte → la
// douleur ; Qualification → le décideur et les chiffres ; Proposition → les
// critères et le processus ; Négociation → le champion et tout le reste.
export const DEFAULT_RULES: DealRules = {
  method: "socle",
  inactivityDays: INACTIVITY_DAYS,
  slowStageFactor: 1.5,
  stageRequirements: {
    1: ["douleur"],
    2: ["decideur", "impact"],
    3: ["criteres", "processus"],
    4: ["champion", "budget", "echeance"],
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
  const stageRequirements: DealRules["stageRequirements"] = {};
  const rawStages = source.stageRequirements && typeof source.stageRequirements === "object" ? (source.stageRequirements as Record<string, unknown>) : null;
  if (rawStages) {
    for (let stage = 1; stage <= MAX_STAGES; stage++) {
      const list = rawStages[String(stage)];
      if (!Array.isArray(list)) continue;
      const keys = [...new Set(list.filter((k): k is QualificationKey => typeof k === "string" && (QUALIFICATION_KEYS as readonly string[]).includes(k)))];
      if (keys.length > 0) stageRequirements[stage] = keys;
    }
  }
  return {
    method,
    inactivityDays: Math.round(clamp(source.inactivityDays, 3, 90, DEFAULT_RULES.inactivityDays)),
    slowStageFactor: Math.round(clamp(source.slowStageFactor, 1, 5, DEFAULT_RULES.slowStageFactor) * 10) / 10,
    stageRequirements: rawStages ? stageRequirements : DEFAULT_RULES.stageRequirements,
  };
}

// Ce qui devrait être connu à l'étape `stage` et ne l'est pas : les
// exigences des étapes 1 à `stage`, limitées aux champs de la méthode.
export function missingForStage(rules: DealRules, stage: number | null, known: Set<string>): QualificationKey[] {
  if (!stage || stage < 1) return [];
  const fields = new Set(qualificationFields(rules));
  const required = new Set<QualificationKey>();
  for (let s = 1; s <= Math.min(stage, MAX_STAGES); s++) for (const k of rules.stageRequirements[s] ?? []) if (fields.has(k)) required.add(k);
  return [...required].filter((k) => !known.has(k));
}
