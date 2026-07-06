import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRole, getCommercialDetailForManager } from "@/lib/db";
import TeamMemberDetailClient from "./TeamMemberDetailClient";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string }>;
}) {
  const { commercialId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const detail = await getCommercialDetailForManager(userId!, commercialId);
  if (!detail) {
    redirect("/team");
  }

  return <TeamMemberDetailClient detail={detail} />;
}
