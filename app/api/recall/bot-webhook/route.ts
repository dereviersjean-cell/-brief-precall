import { NextRequest, NextResponse } from "next/server";
import { createAsyncTranscript } from "@/lib/recall";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    console.log("[bot-webhook] received:", JSON.stringify(body));

    if (body.event === "bot.done") {
      const data = body.data as Record<string, unknown> | undefined;
      const botId = (data?.bot as Record<string, unknown> | undefined)?.id as string | undefined;
      console.log("[bot-webhook] bot done:", botId);
    }

    if (body.event === "recording.done") {
      const data = body.data as Record<string, unknown> | undefined;
      const recordingId = ((data?.data as Record<string, unknown> | undefined)?.recording as Record<string, unknown> | undefined)?.id as string | undefined;
      console.log("[bot-webhook] recording done, recordingId:", recordingId);

      if (recordingId) {
        try {
          const result = await createAsyncTranscript(recordingId);
          console.log("[bot-webhook] transcript requested:", JSON.stringify(result));
        } catch (err) {
          console.log("[bot-webhook] createAsyncTranscript failed:", err instanceof Error ? err.message : String(err));
        }
      }
    }
  } catch {
    console.log("[bot-webhook] failed to parse body");
  }

  return NextResponse.json({ received: true });
}
