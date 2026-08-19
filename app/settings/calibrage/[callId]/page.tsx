import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getUserOrganizationId, getObjectionEvalCall, listObjectionCategories } from "@/lib/db";
import AnnotateClient from "./AnnotateClient";

export const dynamic = "force-dynamic";

export default async function AnnotateCallPage({ params }: { params: Promise<{ callId: string }> }) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  if (role !== "manager") redirect("/settings/general");
  if (!organizationId) redirect("/settings/general");

  const { callId } = await params;
  // Id malformé : 404 plutôt qu'une 22P02 Postgres remontée en erreur 500.
  if (!isUuid(callId)) notFound();
  const [call, categories] = await Promise.all([
    getObjectionEvalCall(organizationId, callId),
    listObjectionCategories(organizationId).catch(() => []),
  ]);
  // null aussi bien pour un call inexistant que pour un call d'une autre
  // organisation — on ne distingue pas les deux côté réponse.
  if (!call) notFound();

  return <AnnotateClient call={call} categories={categories.map((c) => c.label)} />;
}
