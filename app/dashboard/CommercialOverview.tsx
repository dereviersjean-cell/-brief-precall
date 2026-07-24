import Link from "next/link";
import { Phone, FileText, MessagesSquare, TrendingUp, Calendar, Download, Sparkles } from "lucide-react";
import {
  getCommercialDigestData,
  getRecentCallScores,
  getCallsWithAnalysis,
  getUserOrganizationId,
  listRecentObjectionsForOrganization,
} from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { formatContactDisplayName } from "@/lib/format";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import ConnectionsStatus from "./ConnectionsStatus";
import RecentCallsList, { type RecentCallRow } from "./RecentCallsList";
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

  const organizationId = await getUserOrganizationId(userId);
  const [weekStats, rawScores, recentCalls, recentObjections] = await Promise.all([
    getCommercialDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentCallScores(userId, trendSince.toISOString()),
    getCallsWithAnalysis(userId),
    organizationId ? listRecentObjectionsForOrganization(organizationId, 4) : Promise.resolve([]),
  ]);

  const trendWeeks = bucketScoresByWeek(rawScores, TREND_WEEKS, now);

  const last5Calls: RecentCallRow[] = recentCalls.slice(0, 5).map((call) => ({
    id: call.id,
    name: formatContactDisplayName(call.company_name, call.contact_email),
    dateLabel: new Date(call.started_at ?? call.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    score: call.analysis?.scores?.global_score ?? null,
  }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Vue d'ensemble"
            title={
              <>
                Bonjour{userName ? ` ${userName.split(" ")[0]}` : ""}{" "}
                <span className="italic-serif text-[color:var(--violet)]">👋</span>
              </>
            }
            subtitle={`${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — voici votre semaine.`}
            actions={
              <>
                <Button variant="secondary" icon={<Calendar className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                  Cette semaine
                </Button>
                <Button variant="secondary" icon={<Download className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                  Exporter
                </Button>
                <Link
                  href="/brief"
                  className="brand-gradient inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Nouveau brief
                </Link>
              </>
            }
          />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ScoreTrendChart weeks={trendWeeks} title={`Score moyen — ${TREND_WEEKS} dernières semaines`} />

          <FadeIn delay={0.1}>
            <Card padded={false} className="p-5">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-4">Calls récents</h2>
              <RecentCallsList calls={last5Calls} />
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-5">
          <FadeIn delay={0.15}>
            <ConnectionsStatus userId={userId} />
          </FadeIn>

          <FadeIn delay={0.2}>
            <Card padded={false} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Objections récentes de l&apos;équipe</h2>
                <MessagesSquare className="w-4 h-4 text-slate-300" />
              </div>
              {recentObjections.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucune objection indexée pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-3">
                  {recentObjections.map((o) => (
                    <li key={o.id} className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">« {o.objection} »</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {o.companyName ?? "Prospect"} · {new Date(o.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/objections" className="inline-block mt-4 text-xs font-medium text-[color:var(--violet)] hover:underline">
                Toute la bibliothèque →
              </Link>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
