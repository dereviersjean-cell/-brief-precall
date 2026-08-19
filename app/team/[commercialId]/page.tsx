import { redirect, notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getUserRole, getCommercialDetailForManager } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TeamMemberDetailClient from "./TeamMemberDetailClient";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string }>;
}) {
  const { commercialId } = await params;
  // Id malformé : 404 plutôt qu'une 22P02 Postgres remontée en erreur 500.
  if (!isUuid(commercialId)) notFound();
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
