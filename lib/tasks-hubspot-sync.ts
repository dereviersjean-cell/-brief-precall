import { createHubSpotTask, hasHubSpotWriteAccess } from "./crm/hubspot";
import { linkHubSpotTaskId, type CreatedTaskForHubSpot } from "./db";

// Called after generateTasksFromTemplates (lib/db.ts) with whichever of the
// newly-created tasks have push_to_hubspot enabled on their template. One
// call site (bot-webhook route, the two Inngest cron functions) per task
// trigger — kept as a single shared function so the create-then-link dance
// and the write access check aren't triplicated.
//
// Best-effort per task, mirroring lib/notifications-dispatcher.ts: a failure
// on one task (unresolved contact, transient HubSpot error) doesn't block
// the others or the caller's own flow, which already treats task generation
// itself as non-blocking.
export async function pushNewTasksToHubSpot(
  userId: string,
  tasks: CreatedTaskForHubSpot[],
  contactEmail: string | null
): Promise<void> {
  if (tasks.length === 0 || !contactEmail) return;

  const hasAccess = await hasHubSpotWriteAccess(userId).catch(() => false);
  if (!hasAccess) return;

  for (const task of tasks) {
    try {
      const hubspotTaskId = await createHubSpotTask(userId, {
        contactEmail,
        title: task.title,
        description: task.description,
        dueAt: task.due_at,
      });
      if (hubspotTaskId) {
        await linkHubSpotTaskId(task.id, hubspotTaskId);
      }
    } catch (err) {
      console.warn(
        "[tasks-hubspot-sync] pushNewTasksToHubSpot failed for task",
        task.id,
        ":",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
