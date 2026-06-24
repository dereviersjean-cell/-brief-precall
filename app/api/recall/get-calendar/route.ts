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
      `https://eu-central-1.recall.ai/api/v2/calendars/${calendarId}/`,
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

    const raw = await res.json() as Record<string, unknown>;
    return NextResponse.json({
      status: raw.status,
      platform: raw.platform,
      status_changes: raw.status_changes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
