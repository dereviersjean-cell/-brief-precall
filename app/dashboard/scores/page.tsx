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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader eyebrow="Performance" title="Scores" subtitle={subtitle} />
        </div>
      </FadeIn>

      {isManager && <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ScoreTrendChart
            weeks={trendWeeks}
            title={viewingTeam ? `Score moyen équipe — ${TREND_WEEKS} dernières semaines` : `Score moyen — ${TREND_WEEKS} dernières semaines`}
          />
        </div>

        <div>
          <FadeIn delay={0.1}>
            <Card padded={false} className="p-4 sm:p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Scores moyens par dimension</h2>
              <span className="mb-4 mt-1 block text-[11.5px] tabular-nums text-slate-500">
                {averages.calls_analyzed_count} call{averages.calls_analyzed_count !== 1 ? "s" : ""} analysé
                {averages.calls_analyzed_count !== 1 ? "s" : ""}, tous temps
              </span>
              {averages.dimensions.length > 0 ? (
                <DimensionScores dimensions={averages.dimensions} />
              ) : (
                <p className="py-6 text-center text-[13px] text-slate-500">Pas encore assez de calls analysés.</p>
              )}
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
