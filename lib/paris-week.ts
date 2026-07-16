// Pure Europe/Paris week-boundary math — zero dependencies on purpose.
// lib/digest.ts and lib/dashboard.ts both need this, but lib/digest.ts also
// pulls in the Anthropic SDK (server-only) — if this logic lived in either
// of those files, importing it from a client component (app/dashboard's
// stat tiles/charts need the ScoreTrendWeek type and bucketing) would drag
// the Anthropic SDK into the browser bundle. Keeping it dependency-free
// here is what makes it safe to import from both server and client code.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function mostRecentParisMonday(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const weekday = weekdayMap[get("weekday")] ?? 0;

  const todayUTCMidnight = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return new Date(todayUTCMidnight.getTime() - daysSinceMonday * ONE_DAY_MS);
}

export type ScoreTrendWeek = {
  weekStart: Date;
  weekLabel: string; // e.g. "7 juil."
  avgScore: number | null;
  callsCount: number;
};

function formatWeekLabel(weekStart: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(weekStart);
}

// Buckets raw per-call scores into `weeks` consecutive Monday-anchored weeks
// ending with the current week (Europe/Paris) — oldest first, ready to
// render left-to-right. Server-only in practice (only called from
// app/dashboard's Server Components, which pass the plain-data result down
// to client chart components as props) but has no server-only dependency
// itself.
export function bucketScoresByWeek(
  scores: { created_at: string; global_score: number | null }[],
  weeks: number,
  now: Date
): ScoreTrendWeek[] {
  const thisMonday = mostRecentParisMonday(now);
  const buckets: ScoreTrendWeek[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisMonday.getTime() - i * 7 * ONE_DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * ONE_DAY_MS);
    const inWeek = scores.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
    const withScore = inWeek.filter((s): s is { created_at: string; global_score: number } => s.global_score !== null);
    const avgScore = withScore.length > 0 ? withScore.reduce((sum, s) => sum + s.global_score, 0) / withScore.length : null;

    buckets.push({ weekStart, weekLabel: formatWeekLabel(weekStart), avgScore, callsCount: inWeek.length });
  }

  return buckets;
}
