import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { hasPipedriveWriteAccess } from "@/lib/crm/pipedrive";

// Mirrors hubspot-status/route.ts — backs the "reconnexion requise" warning
// in NotificationSettingsClient.tsx for the pipedrive channel: existing
// connections predate the deals:full/contacts:full/activities:full scopes
// (module Distribution Flexible sous-étape C2) and need to reconnect before
// writes will work.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const hasWriteAccess = await hasPipedriveWriteAccess(auth.userId);
  return NextResponse.json({ hasWriteAccess });
}
