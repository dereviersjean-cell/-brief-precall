import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.RECALL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RECALL_API_KEY is not set." }, { status: 500 });
  }

  try {
    const res = await fetch("https://eu-central-1.recall.ai/api/v1/bot/", {
      method: "GET",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json() as { results?: Record<string, unknown>[] };
    const bots = (data.results ?? []).map((bot) => ({
      id: bot.id,
      bot_name: bot.bot_name,
      join_at: bot.join_at,
      status_changes: bot.status_changes,
      meeting_url: bot.meeting_url,
    }));
    return NextResponse.json({ status: res.status, count: bots.length, bots });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
