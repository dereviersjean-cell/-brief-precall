import { redirect } from "next/navigation";
import { getUserRole, getTeamOverview, getTeamAverageScores, getOrganizationForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const [overview, averages, organization] = await Promise.all([
    getTeamOverview(userId!),
    getTeamAverageScores(userId!),
    getOrganizationForUser(userId!),
  ]);

  return <TeamClient overview={overview} averages={averages} hasOrganization={organization !== null} />;
}
