import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { hasHubSpotWriteAccess } from "@/lib/crm/hubspot";

// Mirrors calendar-status/route.ts — backs the "reconnexion requise" warning
// in NotificationSettingsClient.tsx for the hubspot channel: existing
// connections predate the notes.write/meetings.write scopes (module
// Distribution Flexible sous-étape C) and need to reconnect before writes
// will work.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const hasWriteAccess = await hasHubSpotWriteAccess(auth.userId);
  return NextResponse.json({ hasWriteAccess });
}
