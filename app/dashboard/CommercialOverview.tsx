import { Phone, FileText, ListChecks, TrendingUp } from "lucide-react";
import {
  getCommercialDigestData,
  getRecentCallScores,
  getCallsWithAnalysis,
  listTasksForUser,
} from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { formatContactDisplayName } from "@/lib/format";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import ConnectionsStatus from "./ConnectionsStatus";
import RecentCallsList, { type RecentCallRow } from "./RecentCallsList";
import TasksList, { type TaskRow } from "./TasksList";
import FadeIn from "./FadeIn";

const TREND_WEEKS = 6;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function CommercialOverview({ userId, userName }: { userId: string; userName: string | null }) {
  const now = new Date();
  // "This week so far" — same range shape as the Friday-evening digest,
  // reused here rather than recomputed (module Distribution Flexible's week
  // convention: Monday 00:00 Europe/Paris → now).
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } = fridayEveningDigestRange(now);
  const trendSince = new Date(mostRecentParisMonday(now).getTime() - (TREND_WEEKS - 1) * 7 * ONE_DAY_MS);

  const [weekStats, rawScores, recentCalls, pendingTasks] = await Promise.all([
    getCommercialDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentCallScores(userId, trendSince.toISOString()),
    getCallsWithAnalysis(userId),
    listTasksForUser(userId, "pending"),
  ]);

  const trendWeeks = bucketScoresByWeek(rawScores, TREND_WEEKS, now);

  const last5Calls: RecentCallRow[] = recentCalls.slice(0, 5).map((call) => ({
    id: call.id,
    name: formatContactDisplayName(call.company_name, call.contact_email),
    dateLabel: new Date(call.started_at ?? call.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    score: call.analysis?.scores?.global_score ?? null,
  }));

  const next5Tasks: TaskRow[] = pendingTasks.slice(0, 5).map((task) => ({
    id: task.id,
    title: task.title,
    dueLabel: new Date(task.due_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bonjour{userName ? ` ${userName.split(" ")[0]}` : ""} 👋</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — voici votre semaine.
          </p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile index={0} accent="indigo" label="Calls cette semaine" value={weekStats.calls_count} icon={<Phone className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Briefs générés" value={weekStats.briefs_count} icon={<FileText className="w-3.5 h-3.5" />} />
        <StatTile
          index={2}
          accent="emerald"
          label="Score moyen"
          value={weekStats.avg_score}
          decimals={1}
          suffix={weekStats.avg_score !== null ? "/5" : undefined}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          trend={weekStats.avg_score !== null ? { current: weekStats.avg_score, previous: weekStats.prev_avg_score } : undefined}
        />
        <StatTile
          index={3}
          accent="amber"
          label="Devis envoyés"
          value={weekStats.quotes_sent}
          detail={weekStats.quotes_accepted > 0 ? `${weekStats.quotes_accepted} accepté${weekStats.quotes_accepted > 1 ? "s" : ""}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ScoreTrendChart weeks={trendWeeks} title={`Score moyen — ${TREND_WEEKS} dernières semaines`} />

          <FadeIn delay={0.1}>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Calls récents</h2>
              <RecentCallsList calls={last5Calls} />
            </div>
          </FadeIn>
        </div>

        <div className="space-y-5">
          <FadeIn delay={0.15}>
            <ConnectionsStatus userId={userId} />
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tâches en attente</h2>
                <ListChecks className="w-4 h-4 text-slate-300" />
              </div>
              <TasksList tasks={next5Tasks} totalCount={pendingTasks.length} />
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
