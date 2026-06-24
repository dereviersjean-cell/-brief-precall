import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRecallCalendarId } from "@/lib/db";

const RECALL_API = "https://eu-central-1.recall.ai/api/v2";

type Attendee = {
  email: string;
  responseStatus: string;
  self?: boolean;
};

type CalendarEvent = {
  id: string;
  start_time: string | null;
  meeting_url: string | null;
  bots: unknown[];
  raw: {
    attendees?: Attendee[];
    [key: string]: unknown;
  };
};

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  const userEmail = session?.user?.email ?? "";

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userDomain = userEmail.split("@")[1] ?? "";
  console.log("[sync-and-schedule] user:", userEmail, "| domain:", userDomain);

  const key = process.env.RECALL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RECALL_API_KEY is not set." }, { status: 500 });
  }

  // Step 1 — get calendarId from DB
  const calendarId = await getRecallCalendarId(userId);
  if (!calendarId) {
    return NextResponse.json({ error: "Aucun calendar Recall.AI associé à ce compte." }, { status: 400 });
  }
  console.log("[sync-and-schedule] calendarId:", calendarId);

  // Step 2 — fetch upcoming events
  const now = new Date().toISOString();
  const eventsRes = await fetch(
    `${RECALL_API}/calendar-events/?calendar_id=${calendarId}&start_time__gte=${encodeURIComponent(now)}`,
    {
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!eventsRes.ok) {
    return NextResponse.json({ error: `Recall.AI error (${eventsRes.status})` }, { status: eventsRes.status });
  }

  const eventsData = await eventsRes.json() as { results?: CalendarEvent[] };
  const events = eventsData.results ?? [];
  console.log("[sync-and-schedule] total upcoming events:", events.length);

  let scheduled = 0;
  let skipped = 0;

  for (const event of events) {
    const logPrefix = `[sync-and-schedule] event ${event.id}`;

    // 1. Must have a meeting URL
    if (!event.meeting_url) {
      console.log(logPrefix, "skipped — no meeting_url");
      skipped++;
      continue;
    }

    const attendees: Attendee[] = event.raw?.attendees ?? [];

    // 2. Must have at least one external attendee
    const hasExternal = attendees.some((a) => {
      const domain = a.email?.split("@")[1] ?? "";
      return domain !== userDomain;
    });
    if (!hasExternal) {
      console.log(logPrefix, "skipped — no external attendee");
      skipped++;
      continue;
    }

    // 3. User must have accepted
    const userAttendee = attendees.find((a) => a.self === true || a.email === userEmail);
    if (!userAttendee || userAttendee.responseStatus !== "accepted") {
      console.log(logPrefix, "skipped — user has not accepted (status:", userAttendee?.responseStatus ?? "not found", ")");
      skipped++;
      continue;
    }

    // 4. No bot already scheduled
    if ((event.bots ?? []).length > 0) {
      console.log(logPrefix, "skipped — bot already scheduled");
      skipped++;
      continue;
    }

    // Schedule bot
    console.log(logPrefix, "scheduling bot for", event.start_time, event.meeting_url);
    try {
      const botRes = await fetch(`${RECALL_API}/calendar-events/${event.id}/bot/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deduplication_key: event.id, bot_config: {} }),
      });
      if (botRes.ok) {
        console.log(logPrefix, "bot scheduled ✓");
        scheduled++;
      } else {
        const err = await botRes.text();
        console.log(logPrefix, "bot scheduling failed:", botRes.status, err);
        skipped++;
      }
    } catch (err) {
      console.log(logPrefix, "bot scheduling threw:", err instanceof Error ? err.message : String(err));
      skipped++;
    }
  }

  console.log("[sync-and-schedule] done — checked:", events.length, "scheduled:", scheduled, "skipped:", skipped);
  return NextResponse.json({ checked: events.length, scheduled, skipped });
}
