import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserName,
  getRecentCallScores,
  getRecentTeamCallScores,
  getUserAverageScores,
  getTeamAverageScores,
  getCommercialsForManager,
} from "@/lib/db";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import { Target } from "lucide-react";
import ScoreTrendChart from "../ScoreTrendChart";
import DimensionScores from "../DimensionScores";
import FadeIn from "../FadeIn";
import CommercialSelector from "../CommercialSelector";

export const dynamic = "force-dynamic";

const TREND_WEEKS = 6;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ commercial?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, userName] = await Promise.all([getUserRole(userId), getUserName(userId)]);
  const isManager = role === "manager";

  // Manager : sélection d'un commercial précis (mêmes règles d'autorisation
  // que /dashboard — getCommercialsForManager est déjà scopé à ce manager).
  const commercials = isManager ? await getCommercialsForManager(userId) : [];
  const { commercial: selectedId } = await searchParams;
  const selected = isManager && selectedId ? commercials.find((c) => c.id === selectedId) ?? null : null;

  const now = new Date();
  const trendSince = new Date(mostRecentParisMonday(now).getTime() - (TREND_WEEKS - 1) * 7 * ONE_DAY_MS);

  const viewingTeam = isManager && !selected;
  const scoresUserId = selected?.id ?? userId;

  const [rawScores, averages] = await Promise.all([
    viewingTeam
      ? getRecentTeamCallScores(commercials.map((c) => c.id), trendSince.toISOString())
      : getRecentCallScores(scoresUserId, trendSince.toISOString()),
    viewingTeam ? getTeamAverageScores(userId) : getUserAverageScores(scoresUserId),
  ]);

  const trendWeeks = bucketScoresByWeek(rawScores, TREND_WEEKS, now);

  const subtitle = viewingTeam
    ? "Tendance et dimensions de scoring, sur toute l'équipe."
    : selected
    ? `Tendance et dimensions de scoring de ${selected.name ?? selected.email}.`
    : `Bonjour${userName ? ` ${userName.split(" ")[0]}` : ""} — tendance et dimensions de vos calls.`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader eyebrow="Performance" title="Scores" subtitle={subtitle} />
        </div>
      </FadeIn>

      {isManager && <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ScoreTrendChart
            weeks={trendWeeks}
            title={viewingTeam ? `Score moyen équipe — ${TREND_WEEKS} dernières semaines` : `Score moyen — ${TREND_WEEKS} dernières semaines`}
          />
        </div>

        <div>
          <FadeIn delay={0.1}>
            <Card padded={false} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)] shrink-0">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Scores moyens par dimension</h2>
              </div>
              <span className="block text-[11px] font-normal text-slate-400 mb-4">
                {averages.calls_analyzed_count} call{averages.calls_analyzed_count !== 1 ? "s" : ""} analysé
                {averages.calls_analyzed_count !== 1 ? "s" : ""}, tous temps
              </span>
              {averages.dimensions.length > 0 ? (
                <DimensionScores dimensions={averages.dimensions} />
              ) : (
                <p className="text-sm text-slate-400 italic">Pas encore assez de calls analysés.</p>
              )}
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
