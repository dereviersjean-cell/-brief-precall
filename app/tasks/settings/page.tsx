import { redirect } from "next/navigation";
import { ensureDefaultTaskTemplates, listTaskTemplates, getImportHubSpotTasksSetting } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasHubSpotWriteAccess } from "@/lib/crm/hubspot";
import TaskTemplatesClient from "./TaskTemplatesClient";

export default async function TaskSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  await ensureDefaultTaskTemplates(userId);
  const [templates, hubspotConnected, importHubspotTasks] = await Promise.all([
    listTaskTemplates(userId),
    hasHubSpotWriteAccess(userId),
    getImportHubSpotTasksSetting(userId),
  ]);

  return (
    <TaskTemplatesClient
      initialTemplates={templates}
      hubspotConnected={hubspotConnected}
      initialImportHubspotTasks={importHubspotTasks}
    />
  );
}
