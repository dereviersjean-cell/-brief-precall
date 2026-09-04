import { redirect } from "next/navigation";
import { getUserRole, getUserOrganizationId, ensureDefaultEmailTemplates } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import EmailTemplatesClient from "./EmailTemplatesClient";

// Déplacé de /team le 04/09/2026 : les templates d'email post-call sont un
// RÉGLAGE de l'organisation, pas du pilotage d'équipe — /team doit rester la
// composition et la performance des commerciaux.
export default async function EmailTemplatesPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/settings");
  }

  const orgId = await getUserOrganizationId(userId!);
  if (!orgId) {
    redirect("/settings");
  }

  const templates = await ensureDefaultEmailTemplates(orgId, userId!);

  return <EmailTemplatesClient templates={templates} />;
}
