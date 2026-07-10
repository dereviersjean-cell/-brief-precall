import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getNotificationPreferencesForUser, setNotificationPreference } from "@/lib/db";
import { AVAILABLE_CHANNELS, expandPreferences, type NotificationEventType, type NotificationChannel } from "@/lib/notification-preferences";

const EVENT_TYPES = Object.keys(AVAILABLE_CHANNELS) as NotificationEventType[];

// Strictly per-user (see lib/db.ts) — auth.userId comes from the session via
// requireActiveUser, never from the request body, on both verbs below.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const existing = await getNotificationPreferencesForUser(auth.userId);
  return NextResponse.json(expandPreferences(existing));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: { event_type?: string; channel?: string; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { event_type: eventType, channel, enabled } = body;
  if (!eventType || !EVENT_TYPES.includes(eventType as NotificationEventType)) {
    return NextResponse.json({ error: "event_type invalide." }, { status: 400 });
  }
  const validChannels = AVAILABLE_CHANNELS[eventType as NotificationEventType];
  if (!channel || !validChannels.includes(channel as NotificationChannel)) {
    return NextResponse.json({ error: "channel invalide pour ce type d'événement." }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled doit être un booléen." }, { status: 400 });
  }

  const updated = await setNotificationPreference(
    auth.userId,
    eventType as NotificationEventType,
    channel as NotificationChannel,
    enabled
  );
  return NextResponse.json(updated);
}
