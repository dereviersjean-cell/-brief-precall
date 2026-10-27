import {
  DEAL_ALERT_RULES,
  type DealAlertRuleKey,
  type DealMemoryAlert,
  type HubspotDealSnapshot,
} from "./deal-memory-schema";
import { slowStage, type PipelineStats } from "./deal-pipeline-stats";
import { DEFAULT_RULES, missingForStage, qualificationLabel, type DealRules } from "./deal-rules";

// Deal Execution, étape 4 (27/10/2026) : la vue manager. Sans dépendance
// (réseau, base) pour être testée ; lib/db.ts lui fournit les lignes.
//
// Décisions du 26/10/2026 : A = la file des deals où intervenir, triée par
// risque puis montant, chaque carte avec ses preuves et une intervention
// proposée, boutons « Vu » / « Plus tard », les deals qui avancent repliés ;
// C = un bandeau des étapes au-dessus, un clic filtre la file ; B = un onglet
// Équipe, une ligne par commercial. Pas de tableau en colonnes façon CRM.

// Ce que le manager peut faire, par alerte. Le manager ne « reprend » jamais
// le deal (réponse de Hubert du 26/10) : chaque proposition passe par le
// commercial, qui reste propriétaire.
// Les règles lues dans les données du deal plutôt que dans un call :
// l'inactivité (date du dernier call) et l'étape qui dure plus que d'habitude
// (historique HubSpot, étape 6).
export type BoardRuleKey = DealAlertRuleKey | "inactivite" | "etape_longue" | "critere_passage";

export const INTERVENTIONS: Record<BoardRuleKey, string> = {
  concurrent_evoque: "Voir avec le commercial comment se positionner face à cette alternative, et ce qui nous distingue pour ce prospect.",
  objection_cachee: "Faire réécouter le passage au commercial et préparer la question qui fera sortir la réserve au prochain échange.",
  preuve_sociale: "Fournir au commercial un cas client du même secteur ou une mise en relation avec un client.",
  interlocuteur_manquant: "Aider le commercial à obtenir un rendez-vous avec cette personne, avec une raison concrète de la faire venir.",
  decideur_absent: "Faire identifier qui décide, et obtenir sa présence au prochain call.",
  prochaine_etape_non_datee: "Demander au commercial de fixer une date pour la prochaine étape, dès aujourd'hui.",
  objection_recurrente: "Revoir la réponse à cette objection avec le commercial : celle donnée la première fois n'a pas suffi.",
  decideur_toujours_absent: "Proposer de rejoindre le prochain call, ou obtenir la présence du décideur avant d'aller plus loin.",
  sentiment_en_baisse: "Faire le point avec le commercial sur ce qui a changé depuis le call précédent, avant la prochaine relance.",
  inactivite: "Relancer le prospect avec le commercial : aucun échange depuis plus de deux semaines.",
  etape_longue: "Voir avec le commercial ce qui retient le deal à cette étape, et ce qu'il faut obtenir du prospect pour passer à la suivante.",
  critere_passage: "Voir avec le commercial comment obtenir ce qui manque avant d'aller plus loin : le deal a avancé sans.",
};

// La même chose côté commercial, pour l'email qu'il reçoit après son call
// (décision du 26/10/2026 : il reçoit les alertes de ses deals en même temps
// que son manager). Mêmes règles, à la deuxième personne.
export const REP_ACTIONS: Record<BoardRuleKey, string> = {
  concurrent_evoque: "Préparer ce qui vous distingue de cette alternative pour ce prospect, et l'aborder au prochain échange.",
  objection_cachee: "Réécouter le passage et préparer la question qui fera sortir la réserve au prochain échange.",
  preuve_sociale: "Envoyer un cas client du même secteur, ou proposer une mise en relation avec un client.",
  interlocuteur_manquant: "Obtenir un rendez-vous avec cette personne, avec une raison concrète de la faire venir.",
  decideur_absent: "Identifier qui décide, et obtenir sa présence au prochain call.",
  prochaine_etape_non_datee: "Fixer une date pour la prochaine étape, dès aujourd'hui.",
  objection_recurrente: "Revoir votre réponse à cette objection : celle donnée la première fois n'a pas suffi.",
  decideur_toujours_absent: "Obtenir la présence du décideur avant d'aller plus loin.",
  sentiment_en_baisse: "Comprendre ce qui a changé depuis le call précédent, avant la prochaine relance.",
  inactivite: "Relancer le prospect : aucun échange depuis plus de deux semaines.",
  etape_longue: "Identifier ce qui retient le deal à cette étape, et le demander au prospect au prochain échange.",
  critere_passage: "Obtenir au prochain call ce qui manque pour cette étape.",
};

// Poids d'une alerte dans le classement : ce qui compare plusieurs calls ou
// touche au décideur pèse plus qu'un signal d'un seul call.
const WEIGHTS: Partial<Record<BoardRuleKey, number>> = {
  decideur_toujours_absent: 3,
  sentiment_en_baisse: 3,
  objection_recurrente: 3,
  decideur_absent: 2,
  prochaine_etape_non_datee: 2,
  inactivite: 2,
  etape_longue: 2,
  critere_passage: 2,
};

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

export function alertLabel(rule: BoardRuleKey): string {
  if (rule === "inactivite") return "Aucune activité";
  if (rule === "etape_longue") return "Étape plus longue que d'habitude";
  if (rule === "critere_passage") return "Critère de passage manquant";
  return RULE_LABELS.get(rule) ?? rule;
}

// Une fiche de call telle que la base la rend, avec son deal.
export type BoardFicheRow = {
  dealId: string;
  dealName: string;
  hubspot: HubspotDealSnapshot | null;
  callId: string;
  callAt: string | null;
  callTitle: string | null;
  ownerId: string;
  generatedAt: string;
  alerts: DealMemoryAlert[];
  // Les champs de la fiche qui ont au moins un élément (critères de passage,
  // lib/deal-rules.ts). Absent : on ne sait pas, pas de critère évalué.
  knownKeys?: string[];
};

export type BoardReview = { dealId: string; status: "seen" | "later"; reviewedAt: string };

export type BoardAlert = { rule: BoardRuleKey; text: string; verbatim: string | null; speaker: string | null };

export type BoardDeal = {
  id: string;
  name: string;
  hubspot: HubspotDealSnapshot | null;
  ownerId: string;
  callCount: number;
  lastCall: { id: string; at: string | null; title: string | null };
  idleDays: number | null;
  alerts: BoardAlert[];
  risk: number;
  intervention: string | null;
  // Pourquoi la carte n'est pas dans la file : vue, remise à plus tard.
  hiddenBecause: "seen" | "later" | null;
};

export type StageColumn = {
  key: string;
  label: string;
  index: number | null;
  count: number;
  atRisk: number;
  // Mesurés sur l'historique HubSpot (étape 6), null sans assez de deals.
  medianDays: number | null;
  passRate: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Une règle lue dans les données du deal, pas dans un call : elle ne dit rien
// de la méthode du commercial, et passe après un signal du call à poids égal.
function isDerived(rule: BoardRuleKey): rule is "inactivite" | "etape_longue" | "critere_passage" {
  return rule === "inactivite" || rule === "etape_longue" || rule === "critere_passage";
}

// Les alertes d'une fiche telles que la file et les emails les montrent : une
// phrase citée, et qui la dit.
export function toBoardAlerts(alerts: DealMemoryAlert[]): BoardAlert[] {
  return alerts.map((a) => ({
    rule: a.rule,
    text: a.text,
    verbatim: a.quote?.find((q) => q.text)?.text ?? a.verbatim,
    speaker: a.quote?.[0]?.speaker ?? null,
  }));
}

// Les deals d'après leurs fiches : chaque deal prend les alertes de sa fiche
// la plus récente (l'état actuel), plus l'inactivité calculée sur son dernier
// call et, quand le parcours est mesuré, l'étape HubSpot qui dure plus que
// d'habitude. `now` est passé pour que le calcul soit testable.
export function buildBoard(
  rows: BoardFicheRow[],
  reviews: BoardReview[],
  now: number,
  pipelineStats?: PipelineStats[] | null,
  rules: DealRules = DEFAULT_RULES
): BoardDeal[] {
  const byDeal = new Map<string, BoardFicheRow[]>();
  for (const row of rows) {
    const list = byDeal.get(row.dealId) ?? [];
    list.push(row);
    byDeal.set(row.dealId, list);
  }
  const reviewByDeal = new Map(reviews.map((r) => [r.dealId, r]));

  const deals: BoardDeal[] = [];
  for (const [dealId, list] of byDeal) {
    const sorted = [...list].sort((a, b) => (b.callAt ?? "").localeCompare(a.callAt ?? ""));
    const latest = sorted[0];
    const idleDays = latest.callAt ? Math.floor((now - new Date(latest.callAt).getTime()) / DAY_MS) : null;

    const alerts = toBoardAlerts(latest.alerts);
    if (idleDays !== null && idleDays >= rules.inactivityDays) {
      alerts.unshift({ rule: "inactivite", text: `Aucun call depuis ${idleDays} jours.`, verbatim: null, speaker: null });
    }
    // Critère de passage (question 9, indicatif) : à l'étape où en est le
    // deal (pipeline HubSpot, sinon son rang), ce qui devrait être connu.
    if (list.every((r) => r.knownKeys)) {
      const known = new Set(list.flatMap((r) => r.knownKeys ?? []));
      const stage = latest.hubspot && !latest.hubspot.closed ? latest.hubspot.stageIndex : latest.hubspot ? null : list.length;
      const missing = missingForStage(rules, stage, known);
      if (missing.length > 0) {
        alerts.push({
          rule: "critere_passage",
          text: `À cette étape, toujours inconnu : ${missing.map((k) => qualificationLabel(k).toLowerCase()).join(", ")}.`,
          verbatim: null,
          speaker: null,
        });
      }
    }
    const slow = latest.hubspot ? slowStage(pipelineStats, latest.hubspot, now, rules.slowStageFactor) : null;
    if (slow) {
      alerts.unshift({
        rule: "etape_longue",
        text: `Dans « ${slow.label} » depuis ${slow.days} jours ; un deal y reste ${formatDays(slow.medianDays)} d'habitude (médiane sur ${slow.samples} passages).`,
        verbatim: null,
        speaker: null,
      });
    }
    const risk = alerts.reduce((sum, a) => sum + (WEIGHTS[a.rule] ?? 1), 0);
    // L'intervention suit l'alerte la plus lourde ; à poids égal, un signal
    // tiré du call passe avant les règles lues dans les données du deal.
    const top = [...alerts].sort(
      (a, b) => (WEIGHTS[b.rule] ?? 1) - (WEIGHTS[a.rule] ?? 1) || Number(isDerived(a.rule)) - Number(isDerived(b.rule))
    )[0];

    // « Vu » vaut jusqu'à la prochaine fiche du deal, « Plus tard » 24 h.
    const review = reviewByDeal.get(dealId);
    const hiddenBecause =
      review?.status === "seen" && review.reviewedAt >= latest.generatedAt
        ? "seen"
        : review?.status === "later" && now - new Date(review.reviewedAt).getTime() < DAY_MS
          ? "later"
          : null;

    deals.push({
      id: dealId,
      name: latest.dealName,
      hubspot: latest.hubspot,
      ownerId: latest.ownerId,
      callCount: list.length,
      lastCall: { id: latest.callId, at: latest.callAt, title: latest.callTitle },
      idleDays,
      alerts,
      risk,
      intervention: top ? INTERVENTIONS[top.rule] : null,
      hiddenBecause,
    });
  }

  // Risque d'abord, montant ensuite : à risque égal, le plus gros deal passe
  // devant ; un deal clos ne demande plus d'intervention.
  return deals
    .filter((d) => !d.hubspot?.closed)
    .sort((a, b) => b.risk - a.risk || (b.hubspot?.amount ?? 0) - (a.hubspot?.amount ?? 0) || a.name.localeCompare(b.name, "fr"));
}

// La même chose à l'instant présent, pour les pages : l'heure est lue ici,
// hors du rendu.
export function buildBoardNow(
  rows: BoardFicheRow[],
  reviews: BoardReview[],
  pipelineStats?: PipelineStats[] | null,
  rules: DealRules = DEFAULT_RULES
): BoardDeal[] {
  return buildBoard(rows, reviews, Date.now(), pipelineStats, rules);
}

export function formatDays(days: number): string {
  const rounded = days < 10 ? Math.round(days * 10) / 10 : Math.round(days);
  return `${String(rounded).replace(".", ",")} jour${rounded >= 2 ? "s" : ""}`;
}

// Le bandeau des étapes, dans l'ordre du pipeline HubSpot ; les deals sans
// deal HubSpot rattaché à part. Quand le parcours est mesuré, toutes les
// étapes ouvertes du pipeline y figurent, même sans deal suivi : c'est le
// parcours entier qu'on lit, avec sa durée habituelle et son taux de passage.
export function buildStages(deals: BoardDeal[], pipelineStats?: PipelineStats[] | null): StageColumn[] {
  const columns = new Map<string, StageColumn>();
  const used = (pipelineStats ?? []).filter((p) =>
    deals.some((d) => d.hubspot && (d.hubspot.pipelineId ? d.hubspot.pipelineId === p.pipelineId : d.hubspot.pipeline === p.pipelineLabel))
  );
  for (const pipeline of used) {
    for (const s of pipeline.stages) {
      const column = columns.get(s.label);
      // Deux pipelines qui partagent un libellé : on garde la première mesure.
      if (column) continue;
      columns.set(s.label, { key: s.label, label: s.label, index: s.order + 1, count: 0, atRisk: 0, medianDays: s.medianDays, passRate: s.passRate });
    }
  }
  for (const d of deals) {
    const key = d.hubspot?.stage ?? "hors-hubspot";
    const column = columns.get(key) ?? {
      key,
      label: d.hubspot?.stage ?? "Hors HubSpot",
      index: d.hubspot?.stageIndex ?? null,
      count: 0,
      atRisk: 0,
      medianDays: null,
      passRate: null,
    };
    column.count += 1;
    if (d.alerts.length > 0) column.atRisk += 1;
    columns.set(key, column);
  }
  return [...columns.values()].sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
}

export type TeamRow = {
  userId: string;
  deals: number;
  atRisk: number;
  // Part des deals dont le dernier call se termine sur une prochaine étape
  // datée ; null sans deal.
  datedNextStepShare: number | null;
  // L'alerte qui revient le plus sur ses deals : son point à travailler.
  recurring: { rule: DealAlertRuleKey; count: number; calls: { id: string; label: string }[] } | null;
};

export function buildTeam(deals: BoardDeal[], userIds: string[]): TeamRow[] {
  return userIds.map((userId) => {
    const own = deals.filter((d) => d.ownerId === userId);
    // L'inactivité et l'étape qui dure ne sont pas des points de méthode du
    // commercial : elles restent dans la file, pas dans son point à travailler.
    const counts = new Map<DealAlertRuleKey, { count: number; calls: { id: string; label: string }[] }>();
    for (const d of own) {
      for (const a of d.alerts) {
        if (isDerived(a.rule)) continue;
        const entry = counts.get(a.rule) ?? { count: 0, calls: [] };
        entry.count += 1;
        entry.calls.push({ id: d.lastCall.id, label: d.lastCall.title ?? d.name });
        counts.set(a.rule, entry);
      }
    }
    const recurring = [...counts.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    return {
      userId,
      deals: own.length,
      atRisk: own.filter((d) => d.alerts.length > 0).length,
      datedNextStepShare: own.length > 0 ? own.filter((d) => !d.alerts.some((a) => a.rule === "prochaine_etape_non_datee")).length / own.length : null,
      // Un point « récurrent » apparaît au moins sur deux deals.
      recurring: recurring && recurring[1].count >= 2 ? { rule: recurring[0], count: recurring[1].count, calls: recurring[1].calls } : null,
    };
  });
}

// ─── Emails : alertes après un call, email du matin au manager ──────────────
//
// Décisions du 26/10/2026 (reco 11, validée par Hubert) : le commercial reçoit
// les alertes de son call dès que la fiche est prête ; le manager reçoit la
// file chaque matin, et tout de suite quand le risque est élevé.

// Risque élevé = une alerte qui compare plusieurs calls (objection qui revient,
// décideur toujours pas rencontré, prospect moins engagé) : le deal se dégrade
// d'un call à l'autre, attendre le lendemain matin serait trop tard.
export function isHighRisk(rules: BoardRuleKey[]): boolean {
  return rules.some((rule) => (WEIGHTS[rule] ?? 1) >= 3);
}

// Les alertes dans l'ordre où les lire : les plus lourdes d'abord.
export function sortByWeight<T extends { rule: BoardRuleKey }>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => (WEIGHTS[b.rule] ?? 1) - (WEIGHTS[a.rule] ?? 1));
}

export const MORNING_EMAIL_MAX_DEALS = 5;

// L'email du matin reprend la file de /deals telle quelle (déjà triée, sans
// les deals vus ou remis à plus tard), limitée aux deals qui ont une alerte.
// Rien à signaler = pas d'email : un email vide chaque matin apprend à ne
// plus les ouvrir.
export function morningQueue(deals: BoardDeal[]): { shown: BoardDeal[]; total: number } {
  const queue = deals.filter((d) => !d.hiddenBecause && d.alerts.length > 0);
  return { shown: queue.slice(0, MORNING_EMAIL_MAX_DEALS), total: queue.length };
}
