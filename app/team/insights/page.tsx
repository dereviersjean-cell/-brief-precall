import { redirect } from "next/navigation";
import {
  getUserRole,
  getUserOrganizationId,
  getObjectionCategoryStats,
  getTeamAverageScores,
  getTrainingStatsForOrganization,
} from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamInsightsClient from "./TeamInsightsClient";

// Refait le 04/09/2026. La page était bâtie sur la comparaison gagné/perdu
// (getDimensionScoresByOutcome, taux de succès par objection), qui s'appuie
// sur `deal_outcomes` — VÉRIFIÉ VIDE en prod, et durablement : sa source
// « devis » est abandonnée depuis le 31/08, et le cron CRM n'a jamais rien
// remonté malgré HubSpot connecté depuis juillet. L'écran promettait donc une
// lecture qu'aucune donnée ne pouvait honorer.
//
// Décision de Jean : reconstruire sur ce qu'on a réellement — les objections
// rencontrées et leur traitement, les scores du playbook. La question devient
// « ce que l'équipe maîtrise, ce qu'elle rate », qui est actionnable
// aujourd'hui, plutôt que « pourquoi elle gagne », qui attend une donnée
// absente.
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

  // Chacun en .catch : migrations 002 (training_sessions) et 006
  // (objection_categories) peuvent manquer selon l'environnement, et un bloc
  // absent ne doit pas emporter toute la page (pattern bug #14).
  const [objectionStats, teamScores, trainingStats] = await Promise.all([
    getObjectionCategoryStats(orgId).catch(() => []),
    getTeamAverageScores(userId!).catch(() => null),
    getTrainingStatsForOrganization(orgId).catch(() => []),
  ]);

  return (
    <TeamInsightsClient
      objectionStats={objectionStats}
      teamScores={teamScores}
      trainingStats={trainingStats}
    />
  );
}
