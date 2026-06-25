import { NextRequest, NextResponse } from "next/server";
import { createAsyncTranscript, getTranscriptContent, transcriptToText } from "@/lib/recall";
import { createCall, getUserProfile, saveCallAnalysis } from "@/lib/db";
import { analyzeCall } from "@/lib/call-analysis";

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
      const metadata = (data?.bot as Record<string, unknown> | undefined)?.metadata as Record<string, unknown> | undefined;

      const userId = metadata?.userId as string | undefined;
      const calendarEventId = metadata?.calendarEventId as string | null ?? null;
      const contactEmail = metadata?.contactEmail as string | null ?? null;
      const companyName = metadata?.companyName as string | null ?? null;

      console.log("[bot-webhook] transcript.done — transcriptId:", transcriptId, "botId:", botId);
      console.log("[bot-webhook] metadata — userId:", userId, "calendarEventId:", calendarEventId, "contactEmail:", contactEmail);

      if (!transcriptId || !userId) {
        console.log("[bot-webhook] missing transcriptId or userId, skipping");
      } else {
        try {
          // Step 1 — fetch transcript content
          const content = await getTranscriptContent(transcriptId);
          const transcriptText = transcriptToText(content);
          console.log("[bot-webhook] transcript text length:", transcriptText.length, "| preview:", transcriptText.slice(0, 200));

          // Step 2 — save call
          const call = await createCall({
            user_id: userId,
            calendar_event_id: calendarEventId,
            contact_email: contactEmail,
            company_name: companyName,
            transcript: transcriptText,
            status: "done",
            duration_seconds: null,
            recall_bot_id: botId ?? null,
            recording_id: recordingId ?? null,
            transcript_id: transcriptId,
          });
          console.log("[bot-webhook] call created:", call.id);

          // Step 3 — analyze call with Claude
          try {
            const profile = await getUserProfile(userId);
            const meetingDate = new Date().toISOString().split("T")[0] ?? "";
            const analysis = await analyzeCall(transcriptText, {
              clientName: profile?.company_name ?? "",
              clientWebsite: "",
              prospectName: companyName ?? "",
              prospectWebsite: contactEmail ? contactEmail.split("@")[1] ?? "" : "",
              meetingDate,
            });
            await saveCallAnalysis(call.id, analysis);
            console.log("[bot-webhook] call analysis saved, global_score:", analysis.global_score);
          } catch (analysisErr) {
            console.log("[bot-webhook] analyzeCall failed (non-blocking):", analysisErr instanceof Error ? analysisErr.message : String(analysisErr));
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
