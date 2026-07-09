import { redirect } from "next/navigation";
import { getUserRole, getUserOrganizationId, ensureDefaultEmailTemplates } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import EmailTemplatesClient from "./EmailTemplatesClient";

export default async function EmailTemplatesPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/team");
  }

  const orgId = await getUserOrganizationId(userId!);
  if (!orgId) {
    redirect("/team");
  }

  const templates = await ensureDefaultEmailTemplates(orgId, userId!);

  return <EmailTemplatesClient templates={templates} />;
}
