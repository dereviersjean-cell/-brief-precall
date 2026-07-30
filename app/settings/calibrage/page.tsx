import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getUserOrganizationId, listObjectionEvalCalls } from "@/lib/db";
import CalibrageClient from "./CalibrageClient";

export const dynamic = "force-dynamic";

// Calibrage de la détection d'objections — l'annotation de référence, faite
// par la personne qui a l'expertise métier (directeur commercial) et non par
// celle qui a accès au code. D'où une page dans l'app plutôt que des fichiers
// et des commandes de terminal.
export default async function CalibragePage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  if (role !== "manager") redirect("/settings/general");

  const calls = organizationId ? await listObjectionEvalCalls(organizationId).catch(() => []) : [];

  return <CalibrageClient calls={calls} />;
}
