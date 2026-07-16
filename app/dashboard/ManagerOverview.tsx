import { Phone, FileText, Users as UsersIcon, TrendingUp } from "lucide-react";
import { getCommercialsForManager, getManagerDigestData, getRecentTeamCallScores, getTeamAverageScores, getTeamOverview } from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import TeamRosterTable, { type RosterRow } from "./TeamRosterTable";
import DimensionScores from "./DimensionScores";
import TasksList, { type TaskRow } from "./TasksList";
import FadeIn from "./FadeIn";

const TREND_WEEKS = 6;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoLabel(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / ONE_DAY_MS);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}j`;
}

export default async function ManagerOverview({ userId, userName }: { userId: string; userName: string | null }) {
  const now = new Date();
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } = fridayEveningDigestRange(now);
  const trendSince = new Date(mostRecentParisMonday(now).getTime() - (TREND_WEEKS - 1) * 7 * ONE_DAY_MS);

  const commercials = await getCommercialsForManager(userId);
  const commercialIds = commercials.map((c) => c.id);

  const [team, rawTeamScores, averages, overview] = await Promise.all([
    getManagerDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentTeamCallScores(commercialIds, trendSince.toISOString()),
    getTeamAverageScores(userId),
    getTeamOverview(userId),
  ]);

  const trendWeeks = bucketScoresByWeek(rawTeamScores, TREND_WEEKS, now);
  const thisWeekBucket = trendWeeks[trendWeeks.length - 1];
  const lastWeekBucket = trendWeeks[trendWeeks.length - 2];

  const totalCalls = team.reduce((sum, t) => sum + t.calls_count, 0);
  const totalBriefs = team.reduce((sum, t) => sum + t.briefs_count, 0);
  const activeCount = team.filter((t) => t.calls_count > 0).length;

  // Sorted by calls this week desc — the commercials actually working the
  // week rise to the top, quiet ones (a manager's real "who do I check in
  // with" signal) sink visibly to the bottom rather than being alphabetical.
  const rosterRows: RosterRow[] = [...team]
    .sort((a, b) => b.calls_count - a.calls_count)
    .map((t) => ({
      userId: t.user_id,
      name: t.name ?? t.email,
      callsCount: t.calls_count,
      avgScore: t.avg_score,
      needsAttention: t.calls_count === 0 || (t.avg_score !== null && t.avg_score < 2.5),
    }));

  const activityRows: TaskRow[] = commercials.map((c) => ({
    id: c.id,
    title: c.name ?? c.email,
    dueLabel: daysAgoLabel(overview.find((o) => o.user_id === c.id)?.last_activity_at ?? null),
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bonjour{userName ? ` ${userName.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — vue d&apos;équipe.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile index={0} accent="indigo" label="Calls équipe" value={totalCalls} icon={<Phone className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Briefs équipe" value={totalBriefs} icon={<FileText className="w-3.5 h-3.5" />} />
        <StatTile
          index={2}
          accent="emerald"
          label="Score moyen équipe"
          value={thisWeekBucket?.avgScore ?? null}
          decimals={1}
          suffix={thisWeekBucket?.avgScore !== null ? "/5" : undefined}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          trend={thisWeekBucket?.avgScore !== null ? { current: thisWeekBucket.avgScore as number, previous: lastWeekBucket?.avgScore ?? null } : undefined}
        />
        <StatTile index={3} accent="amber" label="Commerciaux actifs" value={activeCount} suffix={`/${commercials.length}`} icon={<UsersIcon className="w-3.5 h-3.5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ScoreTrendChart weeks={trendWeeks} title={`Score moyen équipe — ${TREND_WEEKS} dernières semaines`} />

          <FadeIn delay={0.1}>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 pt-5 mb-1">Équipe cette semaine</h2>
              <TeamRosterTable rows={rosterRows} />
            </div>
          </FadeIn>
        </div>

        <div className="space-y-5">
          {averages.dimensions.length > 0 && (
            <FadeIn delay={0.15}>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Scores moyens par dimension
                  <span className="block text-[11px] font-normal normal-case text-slate-400 mt-0.5">
                    {averages.calls_analyzed_count} call{averages.calls_analyzed_count !== 1 ? "s" : ""} analysé{averages.calls_analyzed_count !== 1 ? "s" : ""}, tous temps
                  </span>
                </h2>
                <DimensionScores dimensions={averages.dimensions} />
              </div>
            </FadeIn>
          )}

          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Dernière activité</h2>
              <TasksList tasks={activityRows} totalCount={activityRows.length} />
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
