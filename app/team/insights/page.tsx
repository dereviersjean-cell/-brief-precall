import { redirect } from "next/navigation";
import {
  getUserRole,
  getUserOrganizationId,
  getObjectionStatsForOrganization,
  getDimensionScoresByOutcome,
  getTrainingStatsForOrganization,
} from "@/lib/db";
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

  // trainingStats en .catch : la table training_sessions (migration 002) peut
  // ne pas encore exister en prod — pattern bug #14.
  const [objectionStats, dimensionScores, trainingStats] = await Promise.all([
    getObjectionStatsForOrganization(orgId),
    getDimensionScoresByOutcome(orgId),
    getTrainingStatsForOrganization(orgId).catch(() => []),
  ]);

  return <TeamInsightsClient objectionStats={objectionStats} dimensionScores={dimensionScores} trainingStats={trainingStats} />;
}
