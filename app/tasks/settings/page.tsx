import { redirect } from "next/navigation";
import { ensureDefaultTaskTemplates, listTaskTemplates } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasHubSpotWriteAccess } from "@/lib/crm/hubspot";
import TaskTemplatesClient from "./TaskTemplatesClient";

export default async function TaskSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  await ensureDefaultTaskTemplates(userId);
  const [templates, hubspotConnected] = await Promise.all([
    listTaskTemplates(userId),
    hasHubSpotWriteAccess(userId),
  ]);

  return <TaskTemplatesClient initialTemplates={templates} hubspotConnected={hubspotConnected} />;
}
