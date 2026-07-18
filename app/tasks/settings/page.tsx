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
    // Falls back to false instead of crashing the whole page — protects
    // against the users.import_hubspot_tasks migration not having run yet
    // on this environment (see CLAUDE.md: migrations are handed over as
    // SQL, not committed, so prod can briefly lag behind this code path).
    getImportHubSpotTasksSetting(userId).catch((err) => {
      console.error("[tasks/settings] getImportHubSpotTasksSetting failed:", err);
      return false;
    }),
  ]);

  return (
    <TaskTemplatesClient
      initialTemplates={templates}
      hubspotConnected={hubspotConnected}
      initialImportHubspotTasks={importHubspotTasks}
    />
  );
}
