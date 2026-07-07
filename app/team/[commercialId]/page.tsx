import { redirect } from "next/navigation";
import { getUserRole, getCommercialDetailForManager } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamMemberDetailClient from "./TeamMemberDetailClient";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string }>;
}) {
  const { commercialId } = await params;
  const userId = await getEffectiveUserId();

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
