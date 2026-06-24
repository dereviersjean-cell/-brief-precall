import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    console.log("[bot-webhook] received:", JSON.stringify(body));

    if (body.event === "bot.done") {
      const data = body.data as Record<string, unknown> | undefined;
      const botId = (data?.bot as Record<string, unknown> | undefined)?.id as string | undefined;
      console.log("[bot-webhook] bot done:", botId);
    }
  } catch {
    console.log("[bot-webhook] failed to parse body");
  }

  return NextResponse.json({ received: true });
}
