import type { DealProgress, DealState } from "./deal-progress";
import { coachingQuestions, interventionLevel, managerTitle, managerWhy } from "./deal-coaching";

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

// Suivi des deals par priorité (maquette A choisie par Jean le 14/11/2026,
// règles d'Hubert en réponse à F1) : peu d'alertes, chacune avec le problème,
// l'action recommandée et la question à poser ; les deals endormis à part.
//  - dégradation : le dernier rendez-vous a fait reculer le deal ;
//  - engagement non tenu : la suite convenue est passée sans nouvel échange ;
//  - blocage : il manque une information requise à l'étape, après deux
//    rendez-vous au moins ;
//  - endormi : aucune progression depuis 14 jours en qualification, 7 jours
//    en proposition (seuils de départ d'Hubert, à tester). Au-delà de 60
//    jours, un deal est toujours endormi : son alerte n'est plus d'actualité.
export type SuiviKind = "degradation" | "engagement" | "blocage" | "endormi";

export const SLEEP_DAYS = { qualification: 14, proposition: 7 } as const;
export const STALE_ALERT_DAYS = 60;

const PROPOSAL_STAGE = /(propos|contrat|contract|n[ée]go|closing|devis|signature)/i;

// Le deal est-il en proposition ou en négociation ? D'après le nom de l'étape
// HubSpot, sinon sa place dans le pipeline (les deux derniers cinquièmes).
export function isProposalStage(d: Pick<DealProgress, "hubspot">): boolean {
  const h = d.hubspot;
  if (!h) return false;
  if (h.stage && PROPOSAL_STAGE.test(h.stage)) return true;
  return !!h.stageIndex && !!h.stageCount && h.stageIndex / h.stageCount > 0.6;
}

export function suiviKind(d: Pick<DealProgress, "verdict" | "nextStep" | "idleDays" | "missingForStage" | "steps" | "hubspot">): SuiviKind | null {
  const idle = d.idleDays ?? 0;
  if (idle >= STALE_ALERT_DAYS) return "endormi";
  if (d.verdict === "recul") return "degradation";
  if (d.nextStep.status === "en_retard") return "engagement";
  if (d.missingForStage.length > 0 && d.steps.length >= 2) return "blocage";
  return idle >= (isProposalStage(d) ? SLEEP_DAYS.proposition : SLEEP_DAYS.qualification) ? "endormi" : null;
}

// Ce que le Suivi des deals affiche d'un deal, calculé côté serveur : le
// navigateur ne reçoit que ces champs, pas tout le deal (fluidité,
// 03/11/2026).
export type SuiviDeal = {
  id: string;
  name: string;
  domain: string | null;
  owner: string;
  rank: number;
  stage: string | null;
  amount: number | null;
  idleDays: number | null;
  lastCallAt: string | null;
  state: DealState;
  kind: SuiviKind | null;
  problem: string;
  action: string;
  questions: string[];
};

export function suiviDeal(d: DealProgress, ownerName: string): SuiviDeal {
  return {
    id: d.id,
    name: d.name,
    domain: d.domain,
    owner: ownerName,
    rank: d.steps.length,
    stage: d.hubspot?.stage ?? null,
    amount: d.hubspot?.amount ?? null,
    idleDays: d.idleDays,
    lastCallAt: d.lastCall.at,
    state: d.state,
    kind: suiviKind(d),
    problem: suiviReason(d, managerWhy(d)),
    action: managerTitle(d, ownerName),
    questions: coachingQuestions(d).slice(0, 2),
  };
}
