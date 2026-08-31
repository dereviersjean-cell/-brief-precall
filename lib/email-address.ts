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
