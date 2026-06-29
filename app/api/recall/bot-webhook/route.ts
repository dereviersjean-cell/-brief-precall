import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAsyncTranscript, getTranscriptContent, transcriptToText } from "@/lib/recall";
import { createCall, getUserProfile, saveCallAnalysis, getGoogleTokens, updateCallFollowUp, getContact, createContact, updateContact } from "@/lib/db";
import { analyzeCall } from "@/lib/call-analysis";
import { refreshGoogleAccessToken, getEmailHistory } from "@/lib/gmail";
import { generateFollowUpEmail } from "@/lib/email-followup";
import Anthropic from "@anthropic-ai/sdk";

async function mergeSummaries(existing: string, newSummary: string): Promise<string> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Fusionne ces deux résumés de relation commerciale en 2-3 phrases concises qui capturent l'essentiel de l'historique et des derniers échanges :\n\nHistorique : ${existing}\n\nDernier call : ${newSummary}`,
    }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text.trim() : newSummary;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const secret = process.env.RECALL_BOT_WEBHOOK_SECRET;
  if (secret) {
    const msgId = request.headers.get("webhook-id") ?? request.headers.get("svix-id") ?? "";
    const msgTimestamp = request.headers.get("webhook-timestamp") ?? request.headers.get("svix-timestamp") ?? "";
    const msgSignature = request.headers.get("webhook-signature") ?? request.headers.get("svix-signature") ?? "";
    try {
      new Webhook(secret).verify(rawBody, {
        "svix-id": msgId,
        "svix-timestamp": msgTimestamp,
        "svix-signature": msgSignature,
      });
    } catch {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  try {
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    if (body.event === "bot.done") {
      const data = body.data as Record<string, unknown> | undefined;
      const botId = (data?.bot as Record<string, unknown> | undefined)?.id as string | undefined;
      console.log("[bot-webhook] bot done:", botId);
    }

    if (body.event === "recording.done") {
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

          // Step 3 — analyze call with Claude (non-blocking, result shared with step 4)
          let savedAnalysis: Awaited<ReturnType<typeof analyzeCall>> | null = null;
          try {
            const profile = await getUserProfile(userId);
            const meetingDate = new Date().toISOString().split("T")[0] ?? "";
            savedAnalysis = await analyzeCall(transcriptText, {
              clientName: profile?.company_name ?? "",
              clientWebsite: "",
              prospectName: companyName ?? "",
              prospectWebsite: contactEmail ? contactEmail.split("@")[1] ?? "" : "",
              meetingDate,
            });
            await saveCallAnalysis(call.id, savedAnalysis);
            console.log("[bot-webhook] call analysis saved, global_score:", savedAnalysis.global_score);
          } catch (analysisErr) {
            console.log("[bot-webhook] analyzeCall failed (non-blocking):", analysisErr instanceof Error ? analysisErr.message : String(analysisErr));
          }

          // Step 4 — upsert contact (non-blocking)
          try {
            if (contactEmail && savedAnalysis?.coaching_summary) {
              const newSummary = savedAnalysis.coaching_summary;
              const existing = await getContact(userId, contactEmail);
              if (existing) {
                const mergedSummary = existing.last_call_summary
                  ? await mergeSummaries(existing.last_call_summary, newSummary)
                  : newSummary;
                await updateContact(userId, contactEmail, {
                  total_calls: existing.total_calls + 1,
                  last_call_summary: mergedSummary,
                  ...(companyName ? { company_name: companyName } : {}),
                });
                console.log("[bot-webhook] contact updated, total_calls:", existing.total_calls + 1);
              } else {
                await createContact({
                  user_id: userId,
                  email: contactEmail,
                  company_name: companyName,
                  total_calls: 1,
                  last_call_summary: newSummary,
                  relationship_stage: "prospect",
                });
                console.log("[bot-webhook] contact created for:", contactEmail);
              }
            }
          } catch (contactErr) {
            console.log("[bot-webhook] contact upsert failed (non-blocking):", contactErr instanceof Error ? contactErr.message : String(contactErr));
          }

          // Step 5 — generate follow-up email (non-blocking)
          try {
            if (!contactEmail) {
              console.log("[bot-webhook] no contactEmail, skipping follow-up email");
            } else {
              const { refreshToken } = await getGoogleTokens(userId);
              if (!refreshToken) {
                console.log("[bot-webhook] no Google refresh token for user, skipping follow-up email");
              } else {
                const freshAccessToken = await refreshGoogleAccessToken(refreshToken);
                const emailHistory = await getEmailHistory(freshAccessToken, contactEmail);
                console.log("[bot-webhook] email history fetched:", emailHistory.length, "messages");
                const followUp = await generateFollowUpEmail(
                  transcriptText,
                  emailHistory,
                  savedAnalysis?.next_steps ?? [],
                  contactEmail
                );
                if (followUp) {
                  await updateCallFollowUp(call.id, followUp);
                  console.log("[bot-webhook] follow-up email saved, subject:", followUp.subject);
                }
              }
            }
          } catch (followUpErr) {
            console.log("[bot-webhook] follow-up email failed (non-blocking):", followUpErr instanceof Error ? followUpErr.message : String(followUpErr));
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
