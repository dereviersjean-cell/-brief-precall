import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { hasCalendarWriteAccess } from "@/lib/google-calendar";

// Backs the "reconnexion requise" warning in NotificationSettingsClient.tsx
// and the proactive note on /settings/connexions — both need to know,
// per-user, whether their stored Google token was granted under the old
// calendar.readonly scope or the current calendar.events one.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const hasWriteAccess = await hasCalendarWriteAccess(auth.userId);
  return NextResponse.json({ hasWriteAccess });
}
