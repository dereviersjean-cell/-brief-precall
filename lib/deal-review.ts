import { DEAL_ALERT_RULES, DEAL_MEMORY_FIELDS } from "./deal-memory-schema";
import { INTERVENTIONS, sortByWeight } from "./deal-board";
import { DEFAULT_RULES, qualificationFields, type DealRules } from "./deal-rules";
import type { DealProgress, ProgressFiche } from "./deal-progress";

// Page d'un deal, version manager (demande de Jean du 27/10/2026) : voir très
// vite ce qui est bien fait, ce qui est mal fait, et s'il faut intervenir.
// Tiré des fiches des calls du deal par des règles fixes, sans appel IA. Sans
// dépendance : importé par l'écran et testé.

export type ReviewObjection = { objection: string; handlingQuality: string | null; handlingComment: string | null };

export type DealReview = {
  good: string[];
  bad: string[];
  // oui = le deal recule ; à surveiller = il stagne ; non = il avance.
  intervene: "oui" | "surveiller" | "non";
  intervention: string | null;
};

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));
const FIELD_LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
const DECIDER_RULES = new Set(["decideur_absent", "decideur_toujours_absent"]);

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function buildDealReview(
  fiches: ProgressFiche[],
  objectionsByCall: Record<string, ReviewObjection[]>,
  progress: DealProgress,
  rules: DealRules = DEFAULT_RULES
): DealReview {
  const fields = qualificationFields(rules);
  const sorted = [...fiches].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? ""));
  const latest = sorted[sorted.length - 1];
  const good: string[] = [];
  const bad: string[] = [];

  // Bien fait : ce que les calls ont obtenu, une suite datée, le décideur
  // identifié, les objections bien traitées.
  const known = fields.filter((k) => sorted.some((f) => (f.fields[k] ?? []).length > 0));
  if (known.length > 0) {
    good.push(`${known.length} informations clés sur ${fields.length} obtenues : ${known.map((k) => lowerFirst(FIELD_LABELS.get(k) ?? k)).join(", ")}`);
  }
  const latestRules = new Set(latest?.alerts.map((a) => a.rule) ?? []);
  if (latest && !latestRules.has("prochaine_etape_non_datee")) good.push("Le dernier call se termine sur une prochaine étape datée");
  if (known.includes("decideur") && ![...latestRules].some((r) => DECIDER_RULES.has(r))) good.push("Le décideur est identifié");

  const objections = sorted.flatMap((f) => objectionsByCall[f.callId] ?? []);
  const seen = new Set<string>();
  const wellHandled: string[] = [];
  const badlyHandled: string[] = [];
  for (const o of objections) {
    const key = normalize(o.objection);
    if (seen.has(key)) continue;
    seen.add(key);
    if (o.handlingQuality === "bien_traitee") wellHandled.push(o.objection);
    else if (o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement") {
      badlyHandled.push(o.handlingComment ? `${o.objection} — ${o.handlingComment}` : o.objection);
    }
  }
  for (const o of wellHandled) good.push(`Objection bien traitée : ${o}`);

  // Mal fait : les alertes du dernier call, les objections mal traitées, ce
  // qui manque encore après plusieurs calls, l'inactivité.
  for (const a of sortByWeight(latest?.alerts ?? [])) bad.push(`${RULE_LABELS.get(a.rule) ?? a.rule} : ${a.text}`);
  for (const o of badlyHandled) bad.push(`Objection mal traitée : ${o}`);
  const missing = fields.filter((k) => !known.includes(k));
  if (sorted.length >= 2 && missing.length > 0) {
    bad.push(`Toujours inconnu après ${sorted.length} calls : ${missing.map((k) => lowerFirst(FIELD_LABELS.get(k) ?? k)).join(", ")}`);
  }
  if (progress.missingForStage.length > 0) bad.push(`Étape franchie sans : ${progress.missingForStage.map((l) => lowerFirst(l)).join(", ")}`);
  if (progress.idleDays !== null && progress.idleDays >= rules.inactivityDays) bad.push(`Aucun call depuis ${progress.idleDays} jours`);

  // L'intervention suit l'alerte la plus lourde du dernier call ; sans
  // alerte, l'inactivité. Le manager ne reprend jamais le deal : chaque
  // proposition passe par le commercial.
  const top = sortByWeight(latest?.alerts ?? [])[0];
  const intervention = top
    ? INTERVENTIONS[top.rule]
    : progress.idleDays !== null && progress.idleDays >= rules.inactivityDays
      ? INTERVENTIONS.inactivite
      : null;

  return {
    good,
    bad,
    intervene: progress.verdict === "recul" ? "oui" : progress.verdict === "arret" ? "surveiller" : "non",
    intervention: progress.verdict === "progres" ? null : intervention,
  };
}
