import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { dismissTask } from "@/lib/db";
import { deleteHubSpotTask } from "@/lib/crm/hubspot";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const { hubspot_task_id } = await dismissTask(taskId, auth.userId);

  // Best-effort, same trade-off as /complete — "rejeter" on Brief means
  // "delete" on HubSpot (per product decision), but a HubSpot failure here
  // doesn't undo the dismissal on Brief's side. after() (not bare
  // fire-and-forget): Vercel can freeze the function as soon as the response
  // is sent, killing an unawaited promise (cf. generate-brief).
  if (hubspot_task_id) {
    const hubspotTaskId = hubspot_task_id;
    after(async () => {
      await deleteHubSpotTask(auth.userId, hubspotTaskId).catch((err) =>
        console.warn(
          "[tasks/dismiss] deleteHubSpotTask failed (non-blocking):",
          err instanceof Error ? err.message : String(err)
        )
      );
    });
  }

  return NextResponse.json({ ok: true });
}
