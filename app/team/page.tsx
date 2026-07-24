import { redirect } from "next/navigation";
import { getUserRole, getTeamOverview, getOrganizationForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamClient from "./TeamClient";

// Onglet "Équipe" = pilotage pur (composition, invitations, rôles) — les
// scores et statistiques détaillées vivent dans Performance (Scores,
// Objections, Entraînement), pas ici (décision du 25/07/2026).
export default async function TeamPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const [overview, organization] = await Promise.all([
    getTeamOverview(userId!),
    getOrganizationForUser(userId!),
  ]);

  return <TeamClient overview={overview} hasOrganization={organization !== null} />;
}
