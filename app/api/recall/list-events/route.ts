import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const calendarId = request.nextUrl.searchParams.get("calendarId");
  if (!calendarId) {
    return NextResponse.json({ error: "calendarId requis." }, { status: 400 });
  }

  const key = process.env.RECALL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RECALL_API_KEY is not set." }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://eu-central-1.recall.ai/api/v2/calendar-events/?calendar_id=${calendarId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Token ${key}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Recall.AI error (${res.status})` }, { status: res.status });
    }

    const data = await res.json() as { results?: Record<string, unknown>[] };
    const events = (data.results ?? []).map((event) => ({
      id: event.id,
      start_time: event.start_time,
      meeting_url: event.meeting_url,
      raw: event,
    }));

    return NextResponse.json({ count: events.length, events });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
