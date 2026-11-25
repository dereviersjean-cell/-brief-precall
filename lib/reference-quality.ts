// Une référence client est « citable » quand elle porte un vrai résultat
// (05/11/2026, page Méthode) : sur les 151 références d'Oliverlist, 124 ont
// « Unknown », « Non spécifié » ou rien à la place, ce qui donne une phrase
// vague à l'oral. Sans dépendance : importable côté client comme serveur.

const EMPTY_VALUE = /^\s*(unknown|inconnu|non\s+sp[ée]cifi[ée]e?|non\s+renseign[ée]e?|n\/?a|aucun|-|–|—)?\s*\.?\s*$/i;

export function hasRealValue(value: string | null | undefined): value is string {
  return typeof value === "string" && !EMPTY_VALUE.test(value);
}

export function isCitableReference(ref: { result: string | null }): boolean {
  return hasRealValue(ref.result);
}

/**
 * Le détail libre d'une référence (`raw_text`), ramené à une phrase donnable
 * au modèle.
 *
 * ⚠ Pourquoi (25/11/2026) : une référence importée d'un CRM n'a ni problème,
 * ni solution, ni résultat — ces trois champs se saisissent à la main. Elle
 * arrivait donc au modèle comme « aucun détail en base », alors que l'import
 * avait rapatrié la description de l'entreprise. Le texte est borné : un
 * import de fichier peut y avoir mis une page entière.
 */
const DETAIL_MAX = 400;

export function referenceDetail(rawText: string | null | undefined): string | null {
  if (!hasRealValue(rawText)) return null;
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= DETAIL_MAX) return text;
  const cut = text.slice(0, DETAIL_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > DETAIL_MAX - 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
