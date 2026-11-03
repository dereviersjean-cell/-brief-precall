import { mergeKnown, objectivesAt, type ObjectiveStatus } from "./call-objectives";
import type { ProgressFiche } from "./deal-progress";
import type { DealRules } from "./deal-rules";
import type { DealTimeline } from "./deal-timeline";

// L'Overview d'un meeting (synthèse produit du 03/11/2026, validée par Jean) :
// comprendre ce qui s'est passé et évaluer l'exécution du playbook client, en
// cinq blocs — synthèse, playbook client, impact sur le deal, engagements et
// suite, coaching. Pas de note sur 5. Sans dépendance serveur.

export type MeetingOverview = {
  rank: number;
  summary: string | null;
  // Ce qu'il fallait aller chercher à ce rendez-vous (objectifs du manager).
  playbook: { key: string; label: string; status: ObjectiveStatus; text: string | null }[];
  // Ce que le call a changé, 5 au plus, sans répéter le playbook.
  impact: { tone: "up" | "down"; text: string }[];
  commitments: { text: string; date: string | null }[];
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
        return { tone: "up" as const, text: `${label} : ${(key && fields[key]?.[0]?.text) || "confirmé"}` };
      }),
    ...fiche.alerts.map((a) => ({ tone: "down" as const, text: a.text })),
    ...call.objections.filter((o) => o.handlingQuality === "non_traitee").map((o) => ({ tone: "down" as const, text: `Objection sans réponse : ${o.objection}` })),
  ].slice(0, 5);

  return {
    rank,
    summary: input.summary ?? call.summary,
    playbook: objectives.review.map((r) => ({ key: r.key, label: r.label, status: r.status, text: r.status === "pas_aborde" ? null : (r.item?.text ?? null) })),
    impact,
    commitments: call.commitments,
    next: { rank: objectives.plan.rank, items: objectives.plan.items.slice(0, 3).map((i) => ({ label: i.label, question: i.question })) },
    strengths: (input.strengths ?? []).slice(0, 3),
    weaknesses: (input.weaknesses ?? []).slice(0, 3),
    recommendation: fiche.nextQuestions?.advice?.coaching?.recommendation ?? null,
  };
}
