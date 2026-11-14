import { mergeKnown, objectivesAt, type ObjectiveStatus } from "./call-objectives";
import { buildDealProgress, type DealState, type ProgressFiche } from "./deal-progress";
import { guessCommitmentSide, type CommitmentSide } from "./deal-macro";
import { MEETING } from "./deal-chronology";
import type { CoachingPoint } from "./deal-memory-schema";
import type { DealRules } from "./deal-rules";
import type { DealTimeline } from "./deal-timeline";

// La page d'un meeting (maquette A choisie par Jean le 14/11/2026) répond aux
// trois questions d'Hubert : qu'est-ce que ce rendez-vous a changé dans le
// deal, que faut-il faire maintenant, qu'est-ce qui aurait pu être mieux
// exécuté. Elle ne montre que ce que CE rendez-vous a apporté ; la page du
// deal consolide. Pas de note sur 5. Sans dépendance serveur.

export type ImpactTag = "nouveau" | "recul" | "concurrent" | "inchange" | "vigilance";

// L'étiquette d'une alerte du call dans « Impact sur le deal ».
const ALERT_TAGS: Record<string, ImpactTag> = {
  concurrent_evoque: "concurrent",
  sentiment_en_baisse: "recul",
  objection_cachee: "recul",
  objection_recurrente: "inchange",
  decideur_toujours_absent: "inchange",
};

export type MeetingOverview = {
  rank: number;
  summary: string | null;
  // Ce qu'il fallait aller chercher à ce rendez-vous (objectifs du manager).
  playbook: { key: string; label: string; status: ObjectiveStatus; text: string | null }[];
  // La synthèse en phrases, cinq au plus.
  summaryLines: string[];
  // Ce que le call a changé, 5 au plus, sans répéter le playbook.
  impact: { tag: ImpactTag; text: string }[];
  // L'état du deal juste avant et juste après ce rendez-vous, s'il a changé.
  stateChange: { from: DealState; to: DealState } | null;
  commitments: { text: string; date: string | null; side: CommitmentSide }[];
  // Coaching constructif (réponse d'Hubert à E2) : deux points au plus de
  // chaque côté. Vide pour un conseil rédigé avant le 14/11/2026.
  coachingStrengths: string[];
  coachingPoints: CoachingPoint[];
  next: { rank: number; items: { label: string; question: string }[] };
  strengths: string[];
  weaknesses: string[];
  recommendation: string | null;
};

export function buildMeetingOverview(input: {
  fiches: (ProgressFiche & { ownerId?: string })[];
  callId: string;
  timeline: DealTimeline;
  rules: DealRules;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  ownerFirstName?: string | null;
}): MeetingOverview | null {
  const { fiches, timeline } = input;
  const index = fiches.findIndex((f) => f.callId === input.callId);
  if (index < 0 || !timeline.calls[index]) return null;
  const rank = index + 1;
  const fiche = fiches[index];
  const call = timeline.calls[index];
  const objectives = objectivesAt(rank, fiche.fields, mergeKnown(fiches.slice(0, index).map((f) => f.fields)), input.rules, fiche.nextQuestions);

  const keyOf = new Map(timeline.grid.map((g) => [g.label, g.key]));
  const shown = new Set(objectives.review.map((r) => r.key));
  const fields = fiche.fields as Record<string, { text: string }[] | undefined>;
  const impact: MeetingOverview["impact"] = [
    ...call.obtained
      .filter((label) => !shown.has(keyOf.get(label) as never))
      .map((label) => {
        const key = keyOf.get(label);
        return { tag: "nouveau" as const, text: `${label} : ${(key && fields[key]?.[0]?.text) || "confirmé"}` };
      }),
    ...fiche.alerts.map((a) => ({ tag: ALERT_TAGS[a.rule] ?? ("vigilance" as const), text: a.text })),
    ...call.objections.filter((o) => o.handlingQuality === "non_traitee").map((o) => ({ tag: "recul" as const, text: `Objection sans réponse : ${o.objection}` })),
  ].slice(0, 5);

  // L'état du deal vu au moment de ce rendez-vous : avant lui, puis avec lui.
  const at = fiche.callAt ? Date.parse(fiche.callAt) : NaN;
  const stateAt = (list: ProgressFiche[]) => (Number.isFinite(at) && list.length > 0 ? (buildDealProgress(list, at, input.rules)[0]?.state ?? null) : null);
  const before = stateAt(fiches.slice(0, index));
  const after = stateAt(fiches.slice(0, index + 1));

  const summary = fiche.nextQuestions?.advice?.synthesis ?? input.summary ?? call.summary;
  const advice = fiche.nextQuestions?.advice ?? null;
  const sides = advice?.commitmentSides ?? null;

  return {
    rank,
    // La synthèse de Haiku (bon numéro de rendez-vous, ce que le call a
    // changé), sinon le résumé de l'analyse.
    summary,
    summaryLines: (summary ?? "")
      .split(/(?<=[.!?…])\s+(?=[\p{Lu}«])/u)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5),
    stateChange: before && after && before !== after ? { from: before, to: after } : null,
    coachingStrengths: advice?.coaching?.strengths ?? [],
    coachingPoints: advice?.coaching?.points ?? [],
    playbook: objectives.review.map((r) => ({ key: r.key, label: r.label, status: r.status, text: r.status === "pas_aborde" ? null : (r.item?.text ?? null) })),
    impact,
    commitments: call.commitments.map((c, i, all) => ({
      ...c,
      side: sides && sides.length === all.length ? sides[i] : guessCommitmentSide(c.text, input.ownerFirstName ?? null, MEETING.test(c.text)),
    })),
    next: { rank: objectives.plan.rank, items: objectives.plan.items.slice(0, 3).map((i) => ({ label: i.label, question: i.question })) },
    strengths: (input.strengths ?? []).slice(0, 2),
    weaknesses: (input.weaknesses ?? []).slice(0, 2),
    recommendation: fiche.nextQuestions?.advice?.coaching?.recommendation ?? null,
  };
}
