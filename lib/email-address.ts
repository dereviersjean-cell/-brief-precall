// Validation d'adresse avant envoi.
//
// Le destinataire d'un email de suivi peut être saisi à la main : quand
// l'invitation d'agenda ne portait aucun participant externe, le call n'a pas
// de contact_email et c'est l'utilisateur qui fournit l'adresse. Une adresse
// malformée n'échoue pas côté Brief — elle part jusqu'à l'API Gmail, qui la
// refuse avec un message que l'utilisateur ne verra jamais. On tranche avant.
//
// Volontairement permissif : le but est d'attraper la faute de frappe
// évidente (« @ » manquant, espace au milieu, domaine sans point), pas de
// réimplémenter la RFC 5322. Un filtre trop strict rejette des adresses
// valides et rares, ce qui coûte plus cher que de laisser passer une adresse
// improbable — de toute façon soumise au verdict de Gmail juste après.
//
// Aucune dépendance : ce module est importé par un composant client autant
// que par les routes serveur (cf. bug #12, fuite de bundle par import
// transitif).
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

// Prénom du destinataire tiré de son adresse (prenom.nom@, prenom_nom@) : le
// transcript ne porte souvent aucun nom (« Unknown: »), et le modèle en
// inventait un — « Guillaume » pour william.bouzemarene@, constaté le
// 29/09/2026. Rien quand l'adresse ne commence pas par un prénom plausible.
const GENERIC_MAILBOXES = new Set([
  "contact", "info", "infos", "hello", "bonjour", "admin", "sales", "vente", "ventes", "commercial",
  "support", "service", "direction", "compta", "comptabilite", "rh", "team", "equipe", "office", "pro",
]);

export function firstNameFromEmail(email: string): string | null {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const match = local.match(/^([a-zà-öø-ÿ]{3,})(?:-[a-zà-öø-ÿ]{2,})?[._]/);
  if (!match || GENERIC_MAILBOXES.has(match[1])) return null;
  const first = local.slice(0, match[0].length - 1);
  return first
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}
