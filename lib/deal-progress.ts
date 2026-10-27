import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  INACTIVITY_DAYS,
  type DealMemoryAlert,
  type DealMemoryContent,
  type DealMemoryItem,
  type HubspotDealSnapshot,
} from "./deal-memory-schema";
import { QUALIFICATION_FIELDS, type QualificationKey } from "./deal-actions";

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
};

export type DealVerdict = "progres" | "arret" | "recul";

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
};

const COMPARISON_RULES = new Set(["objection_recurrente", "decideur_toujours_absent", "sentiment_en_baisse"]);
const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));
const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const DAY_MS = 24 * 60 * 60 * 1000;

const VERDICT_ORDER: Record<DealVerdict, number> = { recul: 0, arret: 1, progres: 2 };

function lowerFirst(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function buildDealProgress(fiches: ProgressFiche[], now: number): DealProgress[] {
  const byDeal = new Map<string, ProgressFiche[]>();
  for (const f of fiches) byDeal.set(f.dealId, [...(byDeal.get(f.dealId) ?? []), f]);

  const deals: DealProgress[] = [];
  for (const [dealId, list] of byDeal) {
    const sorted = [...list].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? ""));
    const seen = new Set<QualificationKey>();
    const steps: DealStep[] = sorted.map((f) => {
      const learned: string[] = [];
      for (const key of QUALIFICATION_FIELDS) {
        if ((f.fields[key] ?? []).length > 0 && !seen.has(key)) {
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
    const idle = idleDays !== null && idleDays >= INACTIVITY_DAYS;

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
      total: QUALIFICATION_FIELDS.length,
      toObtain: QUALIFICATION_FIELDS.filter((k) => !seen.has(k)).map((k) => FIELD_LABELS.get(k) ?? k),
      nextSteps: latest.fields.prochaines_etapes ?? [],
      alerts: latest.alerts.map((a) => RULE_LABELS.get(a.rule) ?? a.rule),
    });
  }

  // Ce qui demande de l'attention d'abord, puis le plus récent.
  return deals.sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || (b.lastCall.at ?? "").localeCompare(a.lastCall.at ?? ""));
}

export function buildDealProgressNow(fiches: ProgressFiche[]): DealProgress[] {
  return buildDealProgress(fiches, Date.now());
}
