import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAsyncTranscript, getBotInfo, getTranscriptContent, transcriptToText, buildTranscriptJson, resolveSpeakerNames } from "@/lib/recall";
import { createCall, getUserProfile, getUserName, getUserEmail, saveCallAnalysis, updateCallAnalysisKeyPoints, getGoogleTokens, updateCallFollowUp, getContact, createContact, updateContact, generateTasksFromTemplates, getPlaybookSnapshotForUser } from "@/lib/db";
import { analyzeCall } from "@/lib/call-analysis";
import { refreshGoogleAccessToken, getEmailHistory } from "@/lib/gmail";
import { generateFollowUpEmail } from "@/lib/email-followup";
import { generateKeyPoints } from "@/lib/key-points";
import { dispatchCallAnalysis } from "@/lib/notifications-dispatcher";
import { formatContactDisplayName } from "@/lib/format";
import Anthropic from "@anthropic-ai/sdk";

type StatusChange = { code: string; created_at: string };

async function extractCallTiming(botInfo: Record<string, unknown>): Promise<{
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  participant_count: number | null;
}> {
  const changes = (botInfo.status_changes as StatusChange[] | null) ?? [];
  const started_at = changes.find((s) => s.code === "in_call_recording")?.created_at ?? null;
  const ended_at = changes.find((s) => s.code === "call_ended")?.created_at ?? null;

  let duration_seconds: number | null = null;
  if (started_at && ended_at) {
    const ms = new Date(ended_at).getTime() - new Date(started_at).getTime();
    if (ms > 0) duration_seconds = Math.round(ms / 1000);
  }

  let participant_count: number | null = null;
  try {
    const recordings = botInfo.recordings as Array<Record<string, unknown>> | undefined;
    const participantEventsData = (recordings?.[0]?.media_shortcuts as Record<string, unknown> | undefined)
      ?.participant_events as Record<string, unknown> | undefined;
    const participantsUrl = (participantEventsData?.data as Record<string, unknown> | undefined)
      ?.participants_download_url as string | undefined;
    if (participantsUrl) {
      const res = await fetch(participantsUrl);
      if (res.ok) {
        const participants = await res.json() as unknown[];
        if (Array.isArray(participants)) participant_count = participants.length;
      }
    }
  } catch (err) {
    console.error("[bot-webhook] participant_count fetch failed (non-blocking):", err instanceof Error ? err.message : String(err));
  }

  return { started_at, ended_at, duration_seconds, participant_count };
}

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

          // Step 1b — fetch bot info for timing
          let timing: { started_at: string | null; ended_at: string | null; duration_seconds: number | null; participant_count: number | null } =
            { started_at: null, ended_at: null, duration_seconds: null, participant_count: null };
          if (botId) {
            try {
              const botInfo = await getBotInfo(botId);
              timing = await extractCallTiming(botInfo);
              console.log("[bot-webhook] timing — started_at:", timing.started_at, "ended_at:", timing.ended_at, "duration_seconds:", timing.duration_seconds, "participant_count:", timing.participant_count);
            } catch (err) {
              console.error("[bot-webhook] getBotInfo failed (non-blocking):", err instanceof Error ? err.message : String(err));
            }
          }

          // Step 1c — normalize transcript_json + resolve an initial
          // speaker_names_override (sous-étape A). Non-blocking: neither must
          // ever prevent the call row itself from being saved — transcript_json
          // stays null and speaker_names_override stays {} on failure, same as
          // for any historical call ingested before this existed.
          let transcriptJson: ReturnType<typeof buildTranscriptJson> | null = null;
          let speakerNamesOverride: Record<string, string> = {};
          try {
            transcriptJson = buildTranscriptJson(content);
            const [commercialName, commercialEmail] = await Promise.all([getUserName(userId), getUserEmail(userId)]);
            speakerNamesOverride = resolveSpeakerNames(content, {
              commercialName,
              commercialEmail,
              contactEmail,
              contactCompanyName: companyName,
            });
            console.log(
              "[bot-webhook] transcript_json turns:",
              transcriptJson.turns.length,
              "| speaker_names_override:",
              JSON.stringify(speakerNamesOverride)
            );
          } catch (err) {
            console.error(
              "[bot-webhook] buildTranscriptJson/resolveSpeakerNames failed (non-blocking):",
              err instanceof Error ? err.message : String(err)
            );
          }

          // Step 2 — save call
          const call = await createCall({
            user_id: userId,
            calendar_event_id: calendarEventId,
            contact_email: contactEmail,
            company_name: companyName,
            transcript: transcriptText,
            status: "done",
            duration_seconds: timing.duration_seconds,
            started_at: timing.started_at,
            ended_at: timing.ended_at,
            participant_count: timing.participant_count,
            recall_bot_id: botId ?? null,
            recording_id: recordingId ?? null,
            transcript_id: transcriptId,
            transcript_json: transcriptJson,
            speaker_names_override: speakerNamesOverride,
          });
          console.log("[bot-webhook] call created:", call.id);

          // Step 3 — analyze call with Claude (non-blocking, result shared with step 4)
          let savedAnalysis: Awaited<ReturnType<typeof analyzeCall>> | null = null;
          let keyPoints: string | null = null;
          try {
            const profile = await getUserProfile(userId);
            const meetingDate = new Date().toISOString().split("T")[0] ?? "";
            // Snapshot the org's playbook now (sous-étape B) — falls back to
            // the hardcoded 4-dimension default when the user has no org or
            // no playbook yet, so this always resolves to something.
            const playbookSnapshot = await getPlaybookSnapshotForUser(userId);
            savedAnalysis = await analyzeCall(
              transcriptText,
              {
                clientName: profile?.company_name ?? "",
                clientWebsite: "",
                prospectName: companyName ?? "",
                prospectWebsite: contactEmail ? contactEmail.split("@")[1] ?? "" : "",
                meetingDate,
              },
              playbookSnapshot
            );
            const { id: analysisId } = await saveCallAnalysis(call.id, savedAnalysis, playbookSnapshot);
            console.log("[bot-webhook] call analysis saved, global_score:", savedAnalysis.scores.global_score);

            try {
              const createdCount = await generateTasksFromTemplates(userId, "call", call.id, {
                contact_id: null,
                contact_email: contactEmail,
                contact_name: null,
              });
              console.log("[bot-webhook] tasks generated from post_call templates:", createdCount);
            } catch (taskErr) {
              console.warn(
                "[bot-webhook] generateTasksFromTemplates failed (non-blocking):",
                taskErr instanceof Error ? taskErr.message : String(taskErr)
              );
            }

            // Step 3b — generate + persist key_points now (module Distribution
            // Flexible, sous-étape B) so the post-call notification email
            // (Step 6 below) has real content instead of an empty section.
            // app/api/feedback/[id]/key-points/route.ts remains the on-demand
            // fallback for calls where this fails, or that predate it.
            try {
              const transcriptForKeyPoints = transcriptJson
                ? transcriptJson.turns
                    .map((t) => `${speakerNamesOverride[t.speaker_id] || t.speaker_id}: ${t.text}`)
                    .join("\n")
                : transcriptText;
              keyPoints = await generateKeyPoints(transcriptForKeyPoints);
              if (keyPoints) {
                await updateCallAnalysisKeyPoints(analysisId, call.id, keyPoints);
                console.log("[bot-webhook] key_points generated and saved");
              } else {
                console.log("[bot-webhook] generateKeyPoints returned null (non-blocking)");
              }
            } catch (keyPointsErr) {
              console.log(
                "[bot-webhook] key_points generation failed (non-blocking):",
                keyPointsErr instanceof Error ? keyPointsErr.message : String(keyPointsErr)
              );
            }
          } catch (analysisErr) {
            console.log("[bot-webhook] analyzeCall failed (non-blocking):", analysisErr instanceof Error ? analysisErr.message : String(analysisErr));
          }

          // Step 4 — upsert contact (non-blocking)
          try {
            if (contactEmail && savedAnalysis?.summary) {
              const newSummary = savedAnalysis.summary;
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

          // Step 6 — dispatch post-call analysis notifications (module
          // Distribution Flexible, sous-étape B; non-blocking). Only
          // meaningful once Step 3 actually produced an analysis.
          if (savedAnalysis) {
            try {
              const results = await dispatchCallAnalysis(
                userId,
                {
                  keyPoints,
                  globalScore: savedAnalysis.scores.global_score,
                  sentiment: savedAnalysis.sentiment,
                },
                {
                  callId: call.id,
                  callTitle: companyName ? `Call avec ${companyName}` : "Votre call",
                  contactName: contactEmail ? formatContactDisplayName(companyName, contactEmail) : null,
                }
              );
              console.log("[bot-webhook] dispatchCallAnalysis results:", results);
            } catch (dispatchErr) {
              console.log(
                "[bot-webhook] dispatchCallAnalysis failed (non-blocking):",
                dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr)
              );
            }
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
