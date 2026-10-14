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
// Mêmes seuils et mêmes couleurs que le reste de l'app (scoreTone de
// ui-bits, liste des calls, page d'un call) : 3,5 et plus en vert, 2 et plus
// en ambre, en dessous en rouge. Le tableau de bord tranchait à 4 et 2,5, si
// bien qu'un même 3,5/5 était vert dans la liste des calls et orange ici.
export function scoreColorClass(score: number): { bar: string; text: string } {
  if (score >= 3.5) return { bar: "bg-[color:var(--success)]", text: "text-emerald-700" };
  if (score >= 2) return { bar: "bg-[color:var(--warning)]", text: "text-amber-700" };
  return { bar: "bg-[color:var(--danger)]", text: "text-rose-700" };
}
