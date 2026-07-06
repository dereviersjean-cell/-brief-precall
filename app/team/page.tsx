import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRole, getTeamOverview, getTeamAverageScores, getOrganizationForUser } from "@/lib/db";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

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
