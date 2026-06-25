import { NextRequest, NextResponse } from "next/server";
import { createAsyncTranscript, getTranscriptContent, transcriptToText, getBotInfo } from "@/lib/recall";
import { getBriefByCalendarEventIdGlobal, createCall } from "@/lib/db";

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
      console.log("[bot-webhook] recording.done full body:", JSON.stringify(body));
      const data = body.data as Record<string, unknown> | undefined;
      const recordingId = (data?.recording as Record<string, unknown> | undefined)?.id as string | undefined;
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

    if (body.event === "transcript.done") {
      const data = body.data as Record<string, unknown> | undefined;
      const transcriptId = (data?.transcript as Record<string, unknown> | undefined)?.id as string | undefined;
      const recordingId = (data?.recording as Record<string, unknown> | undefined)?.id as string | undefined;
      const botId = (data?.bot as Record<string, unknown> | undefined)?.id as string | undefined;

      console.log("[bot-webhook] transcript.done — transcriptId:", transcriptId, "recordingId:", recordingId, "botId:", botId);

      if (!transcriptId || !botId) {
        console.log("[bot-webhook] missing transcriptId or botId, skipping");
      } else {
        try {
          // Step 1 — fetch transcript content
          const content = await getTranscriptContent(transcriptId);
          const transcriptText = transcriptToText(content);
          console.log("[bot-webhook] transcript text length:", transcriptText.length, "| preview:", transcriptText.slice(0, 200));

          // Step 2 — fetch bot info for calendar_meetings and meeting_url
          const bot = await getBotInfo(botId);
          console.log("[bot-webhook] bot info:", JSON.stringify({
            meeting_url: bot.meeting_url,
            calendar_meetings: bot.calendar_meetings,
          }));

          const calendarMeetings = (bot.calendar_meetings as Record<string, unknown>[] | undefined) ?? [];
          const firstMeeting = calendarMeetings[0] as Record<string, unknown> | undefined;

          // Try multiple paths to find the calendar event id
          const calendarEventId =
            (firstMeeting?.calendar_event as Record<string, unknown> | undefined)?.external_id as string
            ?? (firstMeeting?.calendar_event as Record<string, unknown> | undefined)?.id as string
            ?? firstMeeting?.id as string
            ?? null;

          console.log("[bot-webhook] calendarEventId:", calendarEventId);

          // Step 3 — find brief to get user context
          let userId: string | null = null;
          let companyName: string | null = null;
          let contactEmail: string | null = null;

          if (calendarEventId) {
            const brief = await getBriefByCalendarEventIdGlobal(calendarEventId);
            if (brief) {
              userId = brief.user_id;
              companyName = brief.company_name;
              contactEmail = brief.contact_email;
              console.log("[bot-webhook] brief found — userId:", userId, "company:", companyName);
            } else {
              console.log("[bot-webhook] no brief found for calendarEventId:", calendarEventId);
            }
          }

          if (!userId) {
            console.log("[bot-webhook] no userId resolved, skipping call creation");
          } else {
            // Step 4 — save call
            const call = await createCall({
              user_id: userId,
              calendar_event_id: calendarEventId,
              contact_email: contactEmail,
              company_name: companyName,
              transcript: transcriptText,
              status: "done",
              duration_seconds: null,
              recall_bot_id: botId,
              recording_id: recordingId ?? null,
              transcript_id: transcriptId,
            });
            console.log("[bot-webhook] call created:", call.id);
          }
        } catch (err) {
          console.log("[bot-webhook] transcript.done pipeline failed:", err instanceof Error ? err.message : String(err));
        }
      }
    }
  } catch {
    console.log("[bot-webhook] failed to parse body");
  }

  return NextResponse.json({ received: true });
}
