import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.RECALL_CALENDAR_WEBHOOK_SECRET;
  if (secret) {
    const svixId = request.headers.get("svix-id") ?? "";
    const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
    const svixSignature = request.headers.get("svix-signature") ?? "";
    try {
      new Webhook(secret).verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    console.log("[recall webhook] failed to parse body");
    return NextResponse.json({ received: true });
  }

  if (body.event === "calendar.sync_events") {
    const data = body.data as Record<string, unknown> | undefined;
    const calendarId = data?.calendar_id as string | undefined;
    const lastUpdatedTs = data?.last_updated_ts as string | undefined;

    console.log("[recall webhook] calendar.sync_events — calendar_id:", calendarId, "| last_updated_ts:", lastUpdatedTs);

    if (calendarId && lastUpdatedTs) {
      const key = process.env.RECALL_API_KEY;
      if (!key) {
        console.log("[recall webhook] RECALL_API_KEY not set, skipping event fetch");
        return NextResponse.json({ received: true });
      }

      try {
        const url = `https://eu-central-1.recall.ai/api/v2/calendar-events/?calendar_id=${calendarId}&updated_at__gte=${encodeURIComponent(lastUpdatedTs)}`;
        console.log("[recall webhook] fetching events from:", url);

        const res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Token ${key}`,
            "Content-Type": "application/json",
          },
        });

        const eventsData = await res.json() as { results?: Record<string, unknown>[] };
        const events = eventsData.results ?? [];

        console.log("[recall webhook] events count:", events.length);

        for (const event of events) {
          console.log("[recall webhook] event:", JSON.stringify({
            id: event.id,
            start_time: event.start_time,
            meeting_url: event.meeting_url,
            attendees: event.attendees,
          }));
        }
      } catch (err) {
        console.log("[recall webhook] failed to fetch events:", err instanceof Error ? err.message : String(err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
