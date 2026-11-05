// Rendez-vous non commerciaux (réponse de Jean à la question C1, 05/11/2026) :
// un entretien, un point interne ou une étude de cas ne doivent recevoir ni le
// robot d'enregistrement ni une analyse de call. Repérés aux mots du titre de
// l'événement, avec une liste réglable par organisation
// (organizations.non_commercial_config, migration 041).
//
// Sans dépendance : importable côté client (aperçu du réglage) comme côté
// serveur (synchronisation Recall, liste des rendez-vous).

export const DEFAULT_NON_COMMERCIAL_KEYWORDS = [
  "entretien",
  "interview",
  "recrutement",
  "candidat",
  "candidature",
  "case study",
  "point interne",
  "réunion interne",
  "weekly",
  "hebdo",
  "daily",
  "stand-up",
  "standup",
  "one to one",
  "one-to-one",
  "1:1",
  "formation",
  "déjeuner",
  "afterwork",
  "séminaire",
  "codir",
  "comex",
  "rétro",
];

export type NonCommercialConfig = { enabled: boolean; keywords: string[] };

export function resolveNonCommercialConfig(raw: unknown): NonCommercialConfig {
  const value = (raw && typeof raw === "object" ? raw : {}) as { enabled?: unknown; keywords?: unknown };
  const keywords = Array.isArray(value.keywords)
    ? value.keywords.filter((k): k is string => typeof k === "string").map((k) => k.trim()).filter(Boolean)
    : DEFAULT_NON_COMMERCIAL_KEYWORDS;
  return { enabled: value.enabled !== false, keywords };
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Le mot qui a fait classer le titre, ou null. Comparaison sans majuscules ni
// accents, sur des mots entiers : « rétro » ne doit pas attraper
// « rétroplanning », ni « daily » un nom propre qui le contiendrait.
export function nonCommercialMatch(title: string | null | undefined, config: NonCommercialConfig): string | null {
  if (!config.enabled || !title) return null;
  const haystack = normalize(title);
  for (const keyword of config.keywords) {
    const needle = normalize(keyword.trim());
    if (!needle) continue;
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}($|[^\\p{L}\\p{N}])`, "u");
    if (pattern.test(haystack)) return keyword;
  }
  return null;
}
