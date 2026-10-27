import { DEAL_MEMORY_FIELDS, type DealMemoryFieldKey } from "./deal-memory-schema";

// Onglet « HubSpot » de Deals de l'équipe (demande de Jean du 27/10/2026 :
// « une vision claire de l'automatisation, des propriétés détectées et de
// comment elles vont être mises à jour »). Sans dépendance : importé par
// l'écran et testé.

export type HubspotProperty = { name: string; label: string };

// Les mots qui désignent chaque information dans les propriétés d'un client
// (libellés en français ou en anglais, propriétés MEDDIC courantes).
const SYNONYMS: Partial<Record<DealMemoryFieldKey, string[]>> = {
  douleur: ["douleur", "pain", "probleme", "problem", "besoin", "need", "enjeu"],
  impact: ["impact", "metrics", "roi", "gain", "benefice", "valeur", "value"],
  decideur: ["decideur", "economic buyer", "decision maker", "signataire", "economic_buyer"],
  champion: ["champion", "sponsor"],
  criteres: ["criteres", "criteria", "decision criteria"],
  processus: ["processus", "decision process", "process", "paper process"],
  budget: ["budget", "enveloppe"],
  echeance: ["echeance", "timeline", "timing", "deadline", "date de decision", "go live"],
  concurrents: ["concurrent", "competitor", "competition", "alternative"],
  prochaines_etapes: ["next step", "prochaine etape", "next_step"],
  interlocuteurs_manquants: ["interlocuteur", "stakeholder", "partie prenante"],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

// La propriété du HubSpot du client qui semble faite pour cette information :
// son libellé ou son nom interne contient un des mots de l'information. Une
// suggestion seulement : le manager valide.
export function suggestProperty(key: DealMemoryFieldKey, properties: HubspotProperty[], taken: Set<string> = new Set()): HubspotProperty | null {
  const words = (SYNONYMS[key] ?? []).map(normalize);
  for (const word of words) {
    const match = properties.find((p) => !taken.has(p.name) && (normalize(p.label).includes(word) || normalize(p.name).includes(word)));
    if (match) return match;
  }
  return null;
}

export type FieldPlan = {
  key: DealMemoryFieldKey;
  label: string;
  // La propriété où Brief écrit, ou null.
  property: HubspotProperty | null;
  // Une propriété du client qui semble faite pour cette information, quand
  // aucune n'est choisie.
  suggestion: HubspotProperty | null;
};

// Pour chaque information de la fiche : où elle s'écrit, ou ce qu'on suggère.
export function buildFieldPlans(mapping: Partial<Record<DealMemoryFieldKey, string>>, properties: HubspotProperty[]): FieldPlan[] {
  const byName = new Map(properties.map((p) => [p.name, p]));
  const taken = new Set(Object.values(mapping).filter((v): v is string => !!v));
  return DEAL_MEMORY_FIELDS.map((f) => {
    const name = mapping[f.key];
    const property = name ? byName.get(name) ?? { name, label: name } : null;
    const suggestion = property ? null : suggestProperty(f.key, properties, taken);
    if (suggestion) taken.add(suggestion.name);
    return { key: f.key, label: f.label, property, suggestion };
  });
}
