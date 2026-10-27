import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  INACTIVITY_DAYS,
  type DealMemoryAlert,
  type DealMemoryContent,
  type DealMemoryItem,
  type HubspotDealSnapshot,
} from "./deal-memory-schema";
import type { QualificationKey } from "./deal-actions";
import { DEFAULT_RULES, missingForStage, qualificationFields, qualificationLabel, type DealRules } from "./deal-rules";
import { REP_ACTIONS, sortByWeight } from "./deal-board";
import { dealObjectives, isVague, itemLevel, type DealObjectives, type ItemsByField, type StoredQuestions } from "./call-objectives";

// Vue commercial « Mes deals » (demande de Jean du 27/10/2026) : l'évolution
// de chaque deal call après call, et un verdict — en progrès, à l'arrêt, en
// recul. Sans dépendance (réseau, base) : lib/db.ts fournit les fiches.
//
// Le verdict, proposé à Jean le 27/10/2026 :
//  - en recul : le dernier call lève une alerte qui le compare aux
//    précédents (objection qui revient, décideur toujours pas rencontré,
//    prospect moins engagé) ;
//  - à l'arrêt : aucun call depuis INACTIVITY_DAYS jours, ou le dernier call
//    s'est terminé sans prochaine étape datée ;
//  - en progrès : sinon — un call récent, une suite datée, rien ne recule.
// Les informations apprises au dernier call sont données en plus comme
// raison, pas comme condition : un deal presque entièrement qualifié n'a plus
// rien à apprendre et avance pourtant.

export type ProgressFiche = {
  dealId: string;
  dealName: string;
  hubspot: HubspotDealSnapshot | null;
  callId: string;
  callAt: string | null;
  callTitle: string | null;
  fields: DealMemoryContent["fields"];
  alerts: DealMemoryAlert[];
  // Domaine du prospect (deals.domain), pour son logo.
  dealDomain?: string | null;
  // Les questions du prochain call rédigées après ce call (migration 037).
  nextQuestions?: StoredQuestions | null;
};

export type DealVerdict = "progres" | "arret" | "recul";

// « À jour » (accord de Jean du 27/10/2026) : une prochaine étape datée qui
// n'est pas dépassée. en_retard = la date est passée sans nouveau call ;
// sans_suite = aucune date convenue ; non_relevee = fiche antérieure au
// relevé des dates (27/10/2026), qu'on ne regénère pas.
export type NextStepStatus = "a_jour" | "en_retard" | "sans_suite" | "non_relevee";

export type DealStep = {
  callId: string;
  callAt: string | null;
  title: string | null;
  // Informations de qualification connues après ce call (cumul).
  known: number;
  // Celles apprises pour la première fois dans ce call.
  learned: string[];
  alertCount: number;
};

export type DealProgress = {
  id: string;
  name: string;
  hubspot: HubspotDealSnapshot | null;
  steps: DealStep[];
  lastCall: { id: string; at: string | null; title: string | null };
  idleDays: number | null;
  verdict: DealVerdict;
  reasons: string[];
  known: number;
  total: number;
  toObtain: string[];
  // Les engagements du dernier call : la suite prévue.
  nextSteps: DealMemoryItem[];
  // Les alertes du dernier call (libellés).
  alerts: string[];
  // La prochaine étape convenue au dernier call et où elle en est.
  nextStep: { date: string | null; text: string | null; status: NextStepStatus };
  // Ce qu'il y a de plus utile à faire sur ce deal, pour le commercial.
  topAction: string | null;
  // Vue « Mes deals » resserrée (demande de Jean du 27/10/2026 : plus concis,
  // plus clair, plus actionnable) : UN statut et UNE action courte par deal.
  focus: DealFocus;
  // Critères de passage : ce qui devrait être connu à l'étape où en est le
  // deal et ne l'est pas (libellés).
  missingForStage: string[];
  // Vue « Mes deals » en posture de conseil (D3, 27/10/2026) : de quoi
  // expliquer l'action — le domaine pour le logo, l'alerte la plus lourde du
  // dernier call avec sa phrase, les informations à obtenir, la checklist.
  domain: string | null;
  topAlert: { rule: string; label: string; text: string; quote: string | null; speaker: string | null } | null;
  missingKeys: QualificationKey[];
  checklist: { key: QualificationKey; label: string; known: boolean; vague: boolean }[];
  // Les objectifs du prochain call (lib/call-objectives.ts) : ce que le
  // dernier a obtenu, ce qu'il reste à aller chercher, les questions.
  objectives: DealObjectives | null;
};

export type FocusStatus = "relancer" | "traiter" | "bonne_voie";

export type DealFocus = {
  status: FocusStatus;
  // Ce qu'il faut faire, en quelques mots, verbe en tête.
  action: string;
  // Le pourquoi, en quelques mots.
  detail: string | null;
};

// Les actions courtes, une par règle, pour la liste « À faire ».
export const SHORT_ACTIONS: Record<string, string> = {
  concurrent_evoque: "Se démarquer du concurrent",
  objection_cachee: "Faire sortir l'objection cachée",
  preuve_sociale: "Envoyer un cas client",
  interlocuteur_manquant: "Faire venir le bon interlocuteur",
  decideur_absent: "Faire venir le décideur",
  prochaine_etape_non_datee: "Dater la prochaine étape",
  objection_recurrente: "Retravailler l'objection qui revient",
  decideur_toujours_absent: "Obtenir le décideur",
  sentiment_en_baisse: "Comprendre pourquoi le prospect recule",
};

function shortDay(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

// Le statut et l'action d'un deal, par ordre d'urgence :
//  - à relancer : la suite convenue est passée sans nouveau call, ou plus de
//    14 jours sans call ;
//  - à traiter : le deal recule, n'a pas de suite datée, ou le dernier call a
//    levé une alerte ;
//  - en bonne voie : sinon — l'action est de préparer le prochain call.
export function dealFocus(input: {
  verdict: DealVerdict;
  nextStep: DealProgress["nextStep"];
  idleDays: number | null;
  alerts: DealMemoryAlert[];
  nextRank: number;
  // Seuil d'inactivité de l'organisation (lib/deal-rules.ts).
  inactivityDays?: number;
  // Ce qui devrait être connu à l'étape où en est le deal, et ne l'est pas.
  missingForStage?: QualificationKey[];
}): DealFocus {
  const { nextStep, idleDays } = input;
  const threshold = input.inactivityDays ?? INACTIVITY_DAYS;
  if (nextStep.status === "en_retard" || (idleDays !== null && idleDays >= threshold)) {
    return {
      status: "relancer",
      action: "Relancer le prospect",
      detail: nextStep.date ? `prévu le ${shortDay(nextStep.date)}, sans nouveau call` : idleDays !== null ? `aucun call depuis ${idleDays} jours` : null,
    };
  }
  const top = sortByWeight(input.alerts)[0];
  if (input.verdict === "recul" && top) return { status: "traiter", action: SHORT_ACTIONS[top.rule] ?? "Reprendre le deal", detail: "le deal recule" };
  if (nextStep.status === "sans_suite") return { status: "traiter", action: "Dater la prochaine étape", detail: "aucune suite convenue" };
  // Critère de passage non rempli (question 9 : indicatif, il alerte sans
  // rien bloquer).
  const missing = input.missingForStage ?? [];
  if (missing.length > 0) {
    return { status: "traiter", action: `Obtenir : ${missing.map((k) => qualificationLabel(k).toLowerCase()).join(", ")}`, detail: "requis à cette étape" };
  }
  if (top) return { status: "traiter", action: SHORT_ACTIONS[top.rule] ?? "Traiter le point de vigilance", detail: null };
  return {
    status: "bonne_voie",
    action: `Préparer le R${input.nextRank}`,
    detail: nextStep.date ? `le ${shortDay(nextStep.date)}` : null,
  };
}

function nextStepOf(latest: ProgressFiche, today: string, idle: boolean): DealProgress["nextStep"] {
  const items = latest.fields.prochaines_etapes ?? [];
  if (items.length > 0 && items.every((i) => i.date === undefined)) {
    const undated = latest.alerts.some((a) => a.rule === "prochaine_etape_non_datee");
    // Date non relevée, mais plus de 14 jours sans call : la suite convenue
    // est presque sûrement passée.
    return { date: null, text: items[0].text, status: undated ? "sans_suite" : idle ? "en_retard" : "non_relevee" };
  }
  const dated = items.filter((i): i is typeof i & { date: string } => typeof i.date === "string");
  if (dated.length === 0) return { date: null, text: items[0]?.text ?? null, status: "sans_suite" };
  // La prochaine échéance : la plus proche à venir, sinon la dernière passée.
  const upcoming = dated.filter((i) => i.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const pick = upcoming[0] ?? [...dated].sort((a, b) => b.date.localeCompare(a.date))[0];
  return { date: pick.date, text: pick.text, status: pick.date >= today ? "a_jour" : "en_retard" };
}

const COMPARISON_RULES = new Set(["objection_recurrente", "decideur_toujours_absent", "sentiment_en_baisse"]);
const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));
const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const DAY_MS = 24 * 60 * 60 * 1000;

const VERDICT_ORDER: Record<DealVerdict, number> = { recul: 0, arret: 1, progres: 2 };
const FOCUS_ORDER: Record<FocusStatus, number> = { relancer: 0, traiter: 1, bonne_voie: 2 };

function lowerFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function buildDealProgress(fiches: ProgressFiche[], now: number, rules: DealRules = DEFAULT_RULES): DealProgress[] {
  const fields = qualificationFields(rules);
  const byDeal = new Map<string, ProgressFiche[]>();
  for (const f of fiches) byDeal.set(f.dealId, [...(byDeal.get(f.dealId) ?? []), f]);

  const deals: DealProgress[] = [];
  for (const [dealId, list] of byDeal) {
    const sorted = [...list].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? ""));
    const seen = new Set<QualificationKey>();
    const steps: DealStep[] = sorted.map((f) => {
      const learned: string[] = [];
      for (const key of fields) {
        // Seul ce que le prospect a dit clairement compte (28/10/2026).
        if ((f.fields[key] ?? []).some((i) => itemLevel(i) === "confirme") && !seen.has(key)) {
          seen.add(key);
          learned.push(FIELD_LABELS.get(key) ?? key);
        }
      }
      return { callId: f.callId, callAt: f.callAt, title: f.callTitle, known: seen.size, learned, alertCount: f.alerts.length };
    });

    const latest = sorted[sorted.length - 1];
    const lastStep = steps[steps.length - 1];
    const idleDays = latest.callAt ? Math.floor((now - Date.parse(latest.callAt)) / DAY_MS) : null;
    const comparison = latest.alerts.filter((a) => COMPARISON_RULES.has(a.rule));
    const undated = latest.alerts.some((a) => a.rule === "prochaine_etape_non_datee");
    const idle = idleDays !== null && idleDays >= rules.inactivityDays;
    // L'étape du deal : celle du pipeline HubSpot, sinon son rang (R1 = 1).
    const stage = latest.hubspot && !latest.hubspot.closed ? latest.hubspot.stageIndex : latest.hubspot ? null : sorted.length;
    const missing = missingForStage(rules, stage, seen);

    let verdict: DealVerdict;
    const reasons: string[] = [];
    if (comparison.length > 0) {
      verdict = "recul";
      for (const a of comparison) reasons.push(RULE_LABELS.get(a.rule) ?? a.rule);
    } else if (idle || undated) {
      verdict = "arret";
      if (idle) reasons.push(`Aucun call depuis ${idleDays} jours`);
      if (undated) reasons.push("Pas de prochaine étape datée");
    } else {
      verdict = "progres";
      reasons.push("Prochaine étape datée");
    }
    if (lastStep.learned.length > 0 && sorted.length > 1) {
      reasons.push(`Appris au dernier call : ${lastStep.learned.map(lowerFirst).join(", ")}`);
    }

    deals.push({
      id: dealId,
      name: latest.dealName,
      hubspot: latest.hubspot,
      steps,
      lastCall: { id: latest.callId, at: latest.callAt, title: latest.callTitle },
      idleDays,
      verdict,
      reasons,
      known: seen.size,
      total: fields.length,
      toObtain: fields.filter((k) => !seen.has(k)).map((k) => FIELD_LABELS.get(k) ?? k),
      missingForStage: missing.map((k) => qualificationLabel(k)),
      domain: latest.dealDomain ?? sorted.find((f) => f.dealDomain)?.dealDomain ?? null,
      topAlert: (() => {
        const top = sortByWeight(latest.alerts)[0];
        return top
          ? {
              rule: top.rule,
              label: RULE_LABELS.get(top.rule) ?? top.rule,
              text: top.text,
              quote: top.quote?.find((q) => q.text)?.text ?? top.verbatim,
              speaker: top.quote?.[0]?.speaker ?? null,
            }
          : null;
      })(),
      missingKeys: missing,
      checklist: fields.map((k) => ({
        key: k,
        label: qualificationLabel(k),
        known: seen.has(k),
        vague: !seen.has(k) && isVague(sorted.flatMap((f) => f.fields[k] ?? [])),
      })),
      objectives: dealObjectives(
        sorted.map((f) => f.fields as ItemsByField),
        rules,
        latest.nextQuestions
      ),
      nextSteps: latest.fields.prochaines_etapes ?? [],
      alerts: latest.alerts.map((a) => RULE_LABELS.get(a.rule) ?? a.rule),
      nextStep: nextStepOf(latest, new Date(now).toISOString().slice(0, 10), idle),
      // Un deal sans call depuis 14 jours se relance d'abord ; sinon l'alerte
      // la plus lourde du dernier call.
      topAction: idle ? REP_ACTIONS.inactivite : (() => {
        const top = sortByWeight(latest.alerts)[0];
        return top ? REP_ACTIONS[top.rule] : null;
      })(),
      focus: dealFocus({
        verdict,
        nextStep: nextStepOf(latest, new Date(now).toISOString().slice(0, 10), idle),
        idleDays,
        alerts: latest.alerts,
        nextRank: sorted.length + 1,
        inactivityDays: rules.inactivityDays,
        missingForStage: missing,
      }),
    });
  }

  // Ce qui demande de l'attention d'abord (à relancer, à traiter, en bonne
  // voie), puis la tendance, puis le plus récent.
  return deals.sort(
    (a, b) =>
      FOCUS_ORDER[a.focus.status] - FOCUS_ORDER[b.focus.status] ||
      VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
      (b.lastCall.at ?? "").localeCompare(a.lastCall.at ?? "")
  );
}

export function buildDealProgressNow(fiches: ProgressFiche[], rules: DealRules = DEFAULT_RULES): DealProgress[] {
  return buildDealProgress(fiches, Date.now(), rules);
}
