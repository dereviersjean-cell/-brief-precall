// Étapes de rendez-vous (R1/R2/R3) — détection par motif sur le titre du
// meeting + consignes d'évaluation par étape injectées dans analyzeCall.
// Chaque organisation nomme ses RDV à sa façon (« Rencontre Oliverlist » = R1,
// « Présentation Oliverlist » = R2…) : les motifs sont configurés par le
// manager dans /dashboard/playbook (section « Étapes de rendez-vous ») et
// stockés sur organizations.meeting_stage_config.
// Fichier volontairement sans dépendance (pas de lib/db.ts, pas de SDK) —
// consommé côté serveur (webhook Recall) ET côté client (aperçu de détection
// dans l'UI manager), même règle que lib/paris-week.ts (cf. bug #12).

export type MeetingStage = "r1" | "r2" | "r3";

export type MeetingStageSettings = {
  patterns: string[];
  guidance: string;
};

export type MeetingStageConfig = Record<MeetingStage, MeetingStageSettings>;

export const MEETING_STAGES: MeetingStage[] = ["r1", "r2", "r3"];

export const MEETING_STAGE_LABELS: Record<MeetingStage, string> = {
  r1: "R1 — Découverte",
  r2: "R2 — Présentation",
  r3: "R3 — Closing",
};

export const MEETING_STAGE_SHORT_LABELS: Record<MeetingStage, string> = {
  r1: "R1",
  r2: "R2",
  r3: "R3",
};

// Consignes par défaut, éditables par le manager. Injectées dans le message
// utilisateur d'analyzeCall (jamais dans le system prompt : le contrat JSON
// reste forcé côté serveur, cf. règle « template manager » du projet).
export const DEFAULT_MEETING_STAGE_CONFIG: MeetingStageConfig = {
  r1: {
    patterns: [],
    guidance:
      "Ce call est un premier rendez-vous (R1, découverte). Évalue en priorité : la qualité de la découverte (questions ouvertes, compréhension du contexte, des enjeux et du processus de décision du prospect), la qualification (budget, timing, décideurs), l'écoute active (le prospect doit parler plus que le commercial), et l'obtention d'une prochaine étape datée. Ne pénalise pas l'absence de négociation ou de closing : ce n'est pas l'objectif d'un R1.",
  },
  r2: {
    patterns: [],
    guidance:
      "Ce call est un deuxième rendez-vous (R2, présentation/démonstration). Évalue en priorité : la personnalisation de la présentation aux besoins identifiés en R1 (pas une démo générique), la reformulation des enjeux du prospect, le traitement des objections soulevées, l'implication des décideurs présents, et l'avancée concrète vers une proposition. Ne pénalise pas une phase de découverte courte : elle a normalement eu lieu au R1.",
  },
  r3: {
    patterns: [],
    guidance:
      "Ce call est un rendez-vous de closing (R3, négociation/signature). Évalue en priorité : le traitement des dernières objections (prix, timing, concurrence), la qualité de la négociation (défense de la valeur plutôt que concession immédiate), la capacité à obtenir un engagement explicite ou une signature, et la clarté des étapes contractuelles (qui signe, quand, comment). Ne pénalise pas l'absence de découverte : à ce stade elle est derrière.",
  },
};

// Comparaison insensible à la casse et aux accents — « Présentation » et
// « presentation » doivent matcher le même motif.
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    // Combining diacritical marks (U+0300–U+036F) left over after NFD
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Premier motif qui matche (en sous-chaîne du titre), dans l'ordre R1 → R2 →
// R3. null si aucun motif configuré ne matche → analyse générique.
export function detectMeetingStage(meetingTitle: string | null | undefined, config: MeetingStageConfig): MeetingStage | null {
  if (!meetingTitle) return null;
  const title = normalizeForMatch(meetingTitle);
  if (!title) return null;

  for (const stage of MEETING_STAGES) {
    for (const pattern of config[stage].patterns) {
      const normalized = normalizeForMatch(pattern);
      if (normalized && title.includes(normalized)) return stage;
    }
  }
  return null;
}

// Merge défensif d'une valeur jsonb venue de la base (potentiellement
// partielle, mal formée ou d'une version antérieure) vers une config complète.
export function coerceMeetingStageConfig(raw: unknown): MeetingStageConfig {
  const source = (raw ?? {}) as Partial<Record<MeetingStage, Partial<MeetingStageSettings>>>;
  const result = {} as MeetingStageConfig;
  for (const stage of MEETING_STAGES) {
    const entry = source[stage];
    const patterns = Array.isArray(entry?.patterns)
      ? entry.patterns.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
      : DEFAULT_MEETING_STAGE_CONFIG[stage].patterns;
    const guidance =
      typeof entry?.guidance === "string" && entry.guidance.trim().length > 0
        ? entry.guidance.trim()
        : DEFAULT_MEETING_STAGE_CONFIG[stage].guidance;
    result[stage] = { patterns, guidance };
  }
  return result;
}
