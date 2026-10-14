import Link from "next/link";
import { Phone, FileText, Users as UsersIcon, TrendingUp, Calendar, Download, Sparkles } from "lucide-react";
import {
  getCommercialsForManager,
  getManagerDigestData,
  getRecentTeamCallScores,
  getTeamOverview,
} from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import TeamRosterTable, { type RosterRow } from "./TeamRosterTable";
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

  const [team, rawTeamScores, overview] = await Promise.all([
    getManagerDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentTeamCallScores(commercialIds, trendSince.toISOString()),
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Vue d'équipe"
            title={
              <>
                Bonjour{userName ? ` ${userName.split(" ")[0]}` : ""}{" "}
                <span className="italic-serif text-[color:var(--violet)]">👋</span>
              </>
            }
            subtitle={`${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — vue d'équipe.`}
            actions={
              <>
                <Button variant="secondary" className="hidden sm:inline-flex" icon={<Calendar className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                  Cette semaine
                </Button>
                <Button variant="secondary" className="hidden sm:inline-flex" icon={<Download className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                  Exporter
                </Button>
                <Link
                  href="/brief"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] px-4 text-[13px] font-medium text-white shadow-[0_8px_20px_-12px_rgba(76,63,214,0.8)] transition-[filter] hover:brightness-110"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Nouveau brief
                </Link>
              </>
            }
          />
        </div>
      </FadeIn>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ScoreTrendChart weeks={trendWeeks} title={`Score moyen équipe — ${TREND_WEEKS} dernières semaines`} />

          <FadeIn delay={0.1}>
            <Card padded={false} className="overflow-hidden">
              <h2 className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 sm:px-5 sm:pt-5">Équipe cette semaine</h2>
              <TeamRosterTable rows={rosterRows} />
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-4">
          <FadeIn delay={0.15}>
            <Card padded={false} className="p-4 sm:p-5">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Dernière activité</h2>
              <TasksList tasks={activityRows} totalCount={activityRows.length} />
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
