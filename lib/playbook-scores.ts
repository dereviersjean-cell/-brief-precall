import type { PlaybookSnapshot } from "./db";

// Pure / side-effect-free on purpose, and deliberately its own module rather
// than living inside lib/db.ts: it's imported directly by client components
// (FeedbackDetailClient, TestAnalysisAdminClient) for the sous-étape D score
// display, and lib/db.ts pulls in supabaseAdmin + other server-only code at
// module scope — importing anything from it into a "use client" file would
// bundle all of that into the browser.

export type EffectiveScoreItem = {
  key: string;
  label: string;
  score: number;
  description: string;
  weight: number;
};

// Deliberately wider than lib/db.ts's AnalysisScores (which pins the 4
// historical keys as required, for backward compat with unguarded direct
// property access elsewhere) — this just needs "a dict of dimension key to
// score-or-number", which both AnalysisScores and lib/call-analysis.ts's
// dynamic CallAnalysis["scores"] satisfy.
export type ScoresDict = Record<string, { score: number; description: string } | number>;

const LEGACY_DIMENSION_LABELS: Record<string, string> = {
  opening_framing: "Ouverture & cadrage",
  pain_point: "Découverte des besoins",
  pitch_demo: "Pitch & démo",
  next_step: "Prochaine étape",
};
const LEGACY_DIMENSION_ORDER = ["opening_framing", "pain_point", "pitch_demo", "next_step"];

// Rétrocompat bridge (sous-étape D) — reconciles a call_analysis row's
// `scores` (dynamic dimension keys) with its `playbook_snapshot` (labels,
// order, weight at analysis time) into a stable array for display. Analyses
// saved before playbook_snapshot existed (or where the fallback default was
// used without persisting one) fall back to the 4 historical labels/order —
// this is what keeps old analyses displaying correctly with zero data
// migration.
export function getEffectiveScoresForDisplay(callAnalysis: {
  scores: ScoresDict | null;
  playbook_snapshot: PlaybookSnapshot | null;
}): EffectiveScoreItem[] {
  const { scores, playbook_snapshot } = callAnalysis;
  if (!scores) return [];

  if (playbook_snapshot && playbook_snapshot.dimensions.length > 0) {
    return playbook_snapshot.dimensions.flatMap((dim) => {
      const entry = scores[dim.key];
      if (!entry || typeof entry !== "object") return [];
      return [{ key: dim.key, label: dim.label, score: entry.score, description: entry.description, weight: dim.weight }];
    });
  }

  return LEGACY_DIMENSION_ORDER.flatMap((key) => {
    const entry = scores[key];
    if (!entry || typeof entry !== "object") return [];
    return [{ key, label: LEGACY_DIMENSION_LABELS[key] ?? key, score: entry.score, description: entry.description, weight: 1 }];
  });
}
