import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { completeTask } from "@/lib/db";
import { updateHubSpotTaskStatus } from "@/lib/crm/hubspot";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const { hubspot_task_id } = await completeTask(taskId, auth.userId);

  // Best-effort — the task is already completed on Brief's side regardless
  // of whether this succeeds; a transient HubSpot error shouldn't block the
  // user's own action. The polling cron (syncHubSpotTaskStatuses) isn't a
  // safety net here since Brief's side is already the source of truth once
  // completed_at is set — this is purely "keep HubSpot in sync", not
  // "recover from a failure".
  if (hubspot_task_id) {
    updateHubSpotTaskStatus(auth.userId, hubspot_task_id, "COMPLETED").catch((err) =>
      console.warn(
        "[tasks/complete] updateHubSpotTaskStatus failed (non-blocking):",
        err instanceof Error ? err.message : String(err)
      )
    );
  }

  return NextResponse.json({ ok: true });
}
