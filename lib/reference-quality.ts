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
