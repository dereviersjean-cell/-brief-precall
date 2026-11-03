import type { DealProgress } from "./deal-progress";
import { interventionLevel } from "./deal-coaching";

// « Suivi des deals » côté manager (synthèse produit du 03/11/2026, vue « Par
// commercial » choisie par Jean le même jour) : pour chaque commercial, les
// deals où l'intervention du manager compte, avec la raison. Sans dépendance,
// importable côté client.

export type SuiviLevel = "intervenir" | "surveiller" | "seul";

// Intervenir : le deal recule, ou la suite datée au dernier call est passée
// sans nouveau call. Surveiller : à relancer ou à traiter. Le reste avance
// sans le manager.
//
// Pas de seuil « endormi » pour l'instant : la règle « plus de 45 jours sans
// call = à relancer ou clôturer, hors de la file » a été proposée à Jean le
// 03/11/2026 sans réponse ; avec elle, tous les deals de l'équipe
// d'Oliverlist sortaient de la file. À ajouter ici si elle est retenue.
export function suiviLevel(d: DealProgress): SuiviLevel {
  if (d.verdict === "recul" || d.nextStep.status === "en_retard") return "intervenir";
  return interventionLevel(d) === "surveiller" ? "surveiller" : "seul";
}

function dayLabel(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

// La raison affichée sous le deal. Un engagement en retard se dit tel quel ;
// sinon `fallback` (le « pourquoi » du conseil au manager, lib/deal-coaching).
export function suiviReason(d: DealProgress, fallback: string): string {
  if (d.verdict !== "recul" && d.nextStep.status === "en_retard") {
    const what = d.nextStep.text ?? "la suite convenue";
    return `Engagement en retard : ${what}${d.nextStep.date ? ` (prévu le ${dayLabel(d.nextStep.date)})` : ""}`;
  }
  return fallback;
}
