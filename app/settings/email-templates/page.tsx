import { redirect } from "next/navigation";
import { ensureDefaultEmailTemplates } from "@/lib/db";
import { getViewer } from "@/lib/session-user";
import EmailTemplatesClient from "./EmailTemplatesClient";

// Déplacé de /team le 04/09/2026 : les templates d'email post-call sont un
// RÉGLAGE de l'organisation, pas du pilotage d'équipe — /team doit rester la
// composition et la performance des commerciaux.
export default async function EmailTemplatesPage() {
  const viewer = await getViewer();

  if (viewer?.role !== "manager") {
    redirect("/settings");
  }
  const userId = viewer.userId;

  const orgId = viewer.organizationId;
  if (!orgId) {
    redirect("/settings");
  }

  const templates = await ensureDefaultEmailTemplates(orgId, userId!);

  return <EmailTemplatesClient templates={templates} />;
}
