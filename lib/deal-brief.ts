import { DEAL_ALERT_RULES } from "./deal-memory-schema";
import { buildQualification, QUALIFICATION_FIELDS, type QualificationKey, type QualificationRow } from "./deal-actions";
import { REP_ACTIONS, sortByWeight } from "./deal-board";
import type { ProgressFiche } from "./deal-progress";
import { dealObjectives, type DealObjectives, type ItemsByField } from "./call-objectives";
import { DEFAULT_RULES, type DealRules } from "./deal-rules";

// Brief avant un call qui fait suite à d'autres (structure cible de Jean du
// 27/10/2026) : Brief reconnaît que le rendez-vous appartient à un deal déjà
// en cours, et prépare la suite — ce qui s'est dit la dernière fois, ce qui
// est validé dans la checklist, ce qu'il reste à aller chercher. Tiré des
// fiches des calls précédents, sans appel IA. Sans dépendance : importé par
// l'écran et testé.

export type DealBriefContext = {
  dealId: string;
  dealName: string;
  // Le rang du call qui arrive : 2 pour un deuxième call.
  callNumber: number;
  lastCall: { at: string | null; title: string | null };
  // vague = abordé sans réponse nette (27/10/2026) : pas validé.
  checklist: { label: string; done: boolean; vague: boolean; text: string | null }[];
  engagements: { text: string; date: string | null }[];
  points: { label: string; text: string; action: string }[];
  objections: string[];
  toFind: string[];
  // Ce que le dernier call a obtenu de ses objectifs, et ce qu'il faut aller
  // chercher à celui-ci, avec les questions (lib/call-objectives.ts).
  objectives: DealObjectives | null;
};

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

export function buildDealBriefContext(
  fiches: ProgressFiche[],
  latestObjections: { objection: string; handlingQuality: string | null }[],
  fields: readonly QualificationKey[] = QUALIFICATION_FIELDS,
  rules: DealRules = DEFAULT_RULES
): DealBriefContext | null {
  const sorted = [...fiches].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? ""));
  const latest = sorted[sorted.length - 1];
  if (!latest) return null;

  // Ce que les calls d'avant le dernier ont retenu, pour la checklist cumulée.
  const prior: Parameters<typeof buildQualification>[1] = {};
  for (const f of sorted.slice(0, -1).reverse()) {
    for (const [key, items] of Object.entries(f.fields)) {
      const list = (prior[key as keyof typeof prior] ??= []);
      for (const item of items ?? []) list.push({ ...item, callAt: f.callAt });
    }
  }
  const rows: QualificationRow[] = buildQualification(
    { fields: latest.fields, alerts: latest.alerts, model: null, generatedAt: latest.callAt ?? "" },
    prior,
    latest.callAt,
    fields
  );

  return {
    dealId: latest.dealId,
    dealName: latest.dealName,
    callNumber: sorted.length + 1,
    lastCall: { at: latest.callAt, title: latest.callTitle },
    checklist: rows.map((r) => ({ label: r.label, done: r.status !== "manquant", vague: r.vague, text: r.latest?.text ?? null })),
    engagements: (latest.fields.prochaines_etapes ?? []).map((i) => ({ text: i.text, date: i.date ?? null })),
    points: sortByWeight(latest.alerts).map((a) => ({ label: RULE_LABELS.get(a.rule) ?? a.rule, text: a.text, action: REP_ACTIONS[a.rule] })),
    objections: latestObjections
      .filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement")
      .map((o) => o.objection),
    toFind: rows.filter((r) => r.status === "manquant").map((r) => r.label),
    objectives: dealObjectives(sorted.map((f) => f.fields as ItemsByField), rules, latest.nextQuestions),
  };
}

function frenchDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

// Le même contexte pour le modèle qui rédige le brief : il adapte l'accroche
// (reprendre là où on s'était arrêté) et vise les objectifs sur ce qui manque.
export function formatDealBriefForPrompt(ctx: DealBriefContext): string {
  const done = ctx.checklist.filter((c) => c.done);
  return [
    `\n# SUITE D'UN DEAL EN COURS\n`,
    `Ce rendez-vous est le call n°${ctx.callNumber} (R${ctx.callNumber}) avec ce prospect (deal « ${ctx.dealName} »). Dernier call${ctx.lastCall.at ? ` le ${frenchDay(ctx.lastCall.at)}` : ""}.`,
    done.length > 0 ? `\nDéjà validé :\n${done.map((c) => `- ${c.label} : ${c.text ?? "connu"}`).join("\n")}` : "",
    ctx.objectives && ctx.objectives.plan.items.length > 0
      ? `\nObjectifs de ce call fixés par le manager, à aller chercher en priorité :\n${ctx.objectives.plan.items
          .map((i) => `- ${i.label}${i.known ? ` (abordé sans réponse nette : ${i.known.text})` : ""}`)
          .join("\n")}`
      : ctx.toFind.length > 0
        ? `\nEncore inconnu, à aller chercher pendant ce call : ${ctx.toFind.join(", ")}.`
        : "",
    ctx.engagements.length > 0 ? `\nEngagements pris la dernière fois :\n${ctx.engagements.map((e) => `- ${e.text}${e.date ? ` (pour le ${e.date})` : ""}`).join("\n")}` : "",
    ctx.points.length > 0 ? `\nPoints de vigilance du dernier call :\n${ctx.points.map((p) => `- ${p.label} : ${p.text}`).join("\n")}` : "",
    ctx.objections.length > 0 ? `\nObjections mal traitées la dernière fois : ${ctx.objections.join(" ; ")}.` : "",
    `\nCe n'est PAS un premier rendez-vous : l'accroche reprend là où le dernier call s'est arrêté (engagements, point en suspens) au lieu de présenter l'offre ; les objectifs du call visent d'abord ce qui est encore inconnu et les points de vigilance. Ne repose pas de question dont la réponse est déjà validée ci-dessus.\n`,
  ]
    .filter(Boolean)
    .join("\n");
}
