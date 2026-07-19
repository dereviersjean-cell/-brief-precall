import { redirect } from "next/navigation";
import { getUserRole, getUserOrganizationId, getObjectionStatsForOrganization, getDimensionScoresByOutcome } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamInsightsClient from "./TeamInsightsClient";

export default async function TeamInsightsPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/team");
  }

  const orgId = await getUserOrganizationId(userId!);
  if (!orgId) {
    redirect("/team");
  }

  const [objectionStats, dimensionScores] = await Promise.all([
    getObjectionStatsForOrganization(orgId),
    getDimensionScoresByOutcome(orgId),
  ]);

  return <TeamInsightsClient objectionStats={objectionStats} dimensionScores={dimensionScores} />;
}
