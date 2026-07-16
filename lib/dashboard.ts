// Pure helpers shared by app/dashboard's client components (StatTile,
// ScoreTrendChart, RecentCallsList, TeamRosterTable, DimensionScores) — kept
// dependency-free (no lib/digest.ts, no lib/db.ts imports) since importing
// either into a client component would drag their server-only dependencies
// (the Anthropic SDK, supabaseAdmin) into the browser bundle. Week-bucketing
// itself (bucketScoresByWeek) lives in lib/paris-week.ts and is called only
// from Server Components (app/dashboard/*Overview.tsx), which then pass the
// plain-data result down as props — re-exported here as a type only so
// client components can import it from one place.
export type { ScoreTrendWeek } from "./paris-week";

// Same green/orange/red thresholds used everywhere scores are shown
// (ScoreBadge, ScoreBar in app/feedback) — kept in sync manually since
// there's no shared constant for it yet in this codebase.
export function scoreColorClass(score: number): { bar: string; text: string } {
  if (score >= 4) return { bar: "bg-green-500", text: "text-green-700" };
  if (score >= 2.5) return { bar: "bg-orange-400", text: "text-orange-600" };
  return { bar: "bg-red-400", text: "text-red-600" };
}
