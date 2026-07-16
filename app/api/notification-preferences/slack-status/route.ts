import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { hasSlackConnection } from "@/lib/slack";

// Mirrors hubspot-status/pipedrive-status route.ts, but the boolean here
// means "connected at all" rather than "connected with the right scope" —
// Slack only ever requests one scope (chat:write), so there's no narrower
// legacy grant to distinguish from a fuller one like the CRM connections.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const connected = await hasSlackConnection(auth.userId);
  return NextResponse.json({ connected });
}
