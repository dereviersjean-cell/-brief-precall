import { formatContactDisplayName } from "./format";
import { APP_URL } from "@/lib/app-url";

const RECALL_BASE_URL = "https://eu-central-1.recall.ai/api/v1";

function recallHeaders(): HeadersInit {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");
  return {
    Authorization: `Token ${key}`,
    "Content-Type": "application/json",
  };
}

export type RecallCalendarAuthToken = {
  token: string;
  user_id: string;
  redirect_url?: string;
};

export async function generateRecallToken(
  userId: string
): Promise<RecallCalendarAuthToken> {
  const res = await fetch(`${RECALL_BASE_URL}/calendar/authenticate/`, {
    method: "POST",
    headers: recallHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.AI token generation failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<RecallCalendarAuthToken>;
}

export type RecallCalendarV2 = {
  id: string;
  platform: string;
  [key: string]: unknown;
};

async function createRecallCalendarV2Generic(
  userId: string,
  refreshToken: string,
  platform: "google_calendar" | "microsoft_outlook"
): Promise<RecallCalendarV2> {
  const [oauthClientId, oauthClientSecret] =
    platform === "google_calendar"
      ? [process.env.RECALL_GOOGLE_CLIENT_ID, process.env.RECALL_GOOGLE_CLIENT_SECRET]
      : [process.env.RECALL_MICROSOFT_CLIENT_ID, process.env.RECALL_MICROSOFT_CLIENT_SECRET];

  if (!oauthClientId || !oauthClientSecret) {
    throw new Error(`RECALL_${platform === "google_calendar" ? "GOOGLE" : "MICROSOFT"}_CLIENT_ID or _CLIENT_SECRET is not set.`);
  }

  const res = await fetch("https://eu-central-1.recall.ai/api/v2/calendars/", {
    method: "POST",
    headers: recallHeaders(),
    body: JSON.stringify({
      platform,
      oauth_client_id: oauthClientId,
      oauth_client_secret: oauthClientSecret,
      oauth_refresh_token: refreshToken,
      webhook_url: `${APP_URL}/api/recall/webhook`,
      external_id: userId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.AI create calendar failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<RecallCalendarV2>;
}

export async function createRecallCalendarV2(
  userId: string,
  refreshToken: string
): Promise<RecallCalendarV2> {
  return createRecallCalendarV2Generic(userId, refreshToken, "google_calendar");
}

export async function createRecallCalendarV2Microsoft(
  userId: string,
  refreshToken: string
): Promise<RecallCalendarV2> {
  return createRecallCalendarV2Generic(userId, refreshToken, "microsoft_outlook");
}

const RECALL_API_V2 = "https://eu-central-1.recall.ai/api/v2";

type Attendee = {
  email: string;
  responseStatus: string;
  self?: boolean;
};

type CalendarEvent = {
  id: string;
  start_time: string | null;
  meeting_url: string | null;
  bots: unknown[];
  raw: { attendees?: Attendee[]; [key: string]: unknown };
};

export type SyncResult = { checked: number; scheduled: number; skipped: number };

// Shared eligibility check — an event is worth a bot if it has a meeting link,
// at least one external attendee, and the user has accepted it. Returns the skip
// reason (for logging) or null when eligible. Reused by the read-only listing
// below so both places agree on what counts as "eligible for a bot".
function getIneligibilityReason(
  event: CalendarEvent,
  userEmail: string,
  userDomain: string
): string | null {
  if (!event.meeting_url) return "no meeting_url";

  const attendees: Attendee[] = event.raw?.attendees ?? [];

  const hasExternal = attendees.some((a) => (a.email?.split("@")[1] ?? "") !== userDomain);
  if (!hasExternal) return "no external attendee";

  const userAttendee = attendees.find((a) => a.self === true || a.email === userEmail);
  if (!userAttendee || userAttendee.responseStatus !== "accepted") {
    return `user not accepted: ${userAttendee?.responseStatus ?? "not found"}`;
  }

  return null;
}

async function fetchUpcomingCalendarEvents(calendarId: string): Promise<CalendarEvent[]> {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");

  const now = new Date().toISOString();
  const eventsRes = await fetch(
    `${RECALL_API_V2}/calendar-events/?calendar_id=${calendarId}&start_time__gte=${encodeURIComponent(now)}`,
    { headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" } }
  );
  if (!eventsRes.ok) throw new Error(`Recall.AI calendar-events error (${eventsRes.status})`);

  const eventsData = await eventsRes.json() as { results?: CalendarEvent[] };
  return eventsData.results ?? [];
}

function eventTitleOf(event: CalendarEvent): string {
  const raw = event.raw as Record<string, unknown> | undefined;
  return (raw?.summary as string | undefined) ?? (raw?.subject as string | undefined) ?? "Sans titre";
}

export async function syncAndScheduleForUser(
  userId: string,
  userEmail: string
): Promise<SyncResult> {
  const { getRecallCalendarId, upsertScheduledMeetings, pruneScheduledMeetings } = await import("./db");

  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");

  const calendarId = await getRecallCalendarId(userId);
  if (!calendarId) {
    console.log(`[sync] userId ${userId} has no recall_calendar_id, skipping`);
    return { checked: 0, scheduled: 0, skipped: 0 };
  }

  const userDomain = userEmail.split("@")[1] ?? "";

  const events = await fetchUpcomingCalendarEvents(calendarId);
  console.log(`[sync] userId ${userId} — ${events.length} upcoming events`);

  let scheduled = 0;
  let skipped = 0;

  for (const event of events) {
    const logPrefix = `[sync] event ${event.id}`;

    const ineligibleReason = getIneligibilityReason(event, userEmail, userDomain);
    if (ineligibleReason) { console.log(logPrefix, "skipped —", ineligibleReason); skipped++; continue; }

    const attendees: Attendee[] = event.raw?.attendees ?? [];

    if ((event.bots ?? []).length > 0) { console.log(logPrefix, "skipped — bot already scheduled"); skipped++; continue; }

    const externalAttendee = attendees.find((a) => (a.email?.split("@")[1] ?? "") !== userDomain);
    const contactEmail = externalAttendee?.email ?? "";
    const googleEventId = (event.raw?.raw as Record<string, unknown> | undefined)?.id as string | null ?? "";

    console.log(logPrefix, "scheduling bot for", event.start_time, "| contactEmail:", contactEmail, "| googleEventId:", googleEventId);
    try {
      const botRes = await fetch(`${RECALL_API_V2}/calendar-events/${event.id}/bot/`, {
        method: "POST",
        headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          deduplication_key: event.id,
          bot_config: {
            bot_name: "Brief Notetaker",
            metadata: {
              userId,
              calendarEventId: googleEventId ?? "",
              contactEmail: contactEmail ?? "",
              companyName: "",
              // Titre du RDV agenda — relu par le bot-webhook à l'ingestion
              // pour détecter l'étape R1/R2/R3 (lib/meeting-stage.ts). Les
              // bots programmés avant cet ajout n'ont pas la clé : étape non
              // détectée, analyse générique.
              meetingTitle: eventTitleOf(event),
            },
          },
        }),
      });
      if (botRes.ok) {
        console.log(logPrefix, "bot scheduled ✓");
        scheduled++;
      } else {
        console.log(logPrefix, "bot scheduling failed:", botRes.status, await botRes.text());
        skipped++;
      }
    } catch (err) {
      console.log(logPrefix, "bot scheduling threw:", err instanceof Error ? err.message : String(err));
      skipped++;
    }
  }

  // Mirror this sync's snapshot into scheduled_meetings for the admin dashboard —
  // reuses the events response already fetched above, no extra Recall calls.
  try {
    const snapshot = events.map((event) => ({
      calendar_event_id: event.id,
      event_title: eventTitleOf(event),
      event_start_at: event.start_time,
      bot_scheduled: (event.bots ?? []).length > 0,
      ineligibility_reason: getIneligibilityReason(event, userEmail, userDomain),
    }));
    await upsertScheduledMeetings(userId, snapshot);
    await pruneScheduledMeetings(userId, events.map((event) => event.id));
  } catch (err) {
    console.error(`[sync] scheduled_meetings snapshot failed for user ${userId} (non-blocking):`, err instanceof Error ? err.message : String(err));
  }

  return { checked: events.length, scheduled, skipped };
}

export async function getTranscriptContent(transcriptId: string): Promise<unknown> {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");

  const metaRes = await fetch(
    `${RECALL_BASE_URL}/transcript/${transcriptId}/`,
    { headers: recallHeaders() }
  );
  if (!metaRes.ok) throw new Error(`Recall.AI transcript metadata failed (${metaRes.status})`);

  const meta = await metaRes.json() as Record<string, unknown>;
  const downloadUrl = (meta.data as Record<string, unknown> | undefined)?.download_url as string | undefined;
  if (!downloadUrl) throw new Error(`No download_url for transcript ${transcriptId}`);

  const contentRes = await fetch(downloadUrl);
  if (!contentRes.ok) throw new Error(`Transcript download failed (${contentRes.status})`);

  return contentRes.json();
}

// NOTE: the real Recall segment shape (verified against live transcripts)
// has no top-level `speaker` string — it's `segment.participant.name`. The
// cast below always misses, so every call in production falls back to
// "Unknown" for every turn. Left as-is per instructions (kept only for
// rétrocompat of the flat-text column); buildTranscriptJson/
// resolveSpeakerNames below use the real `participant` shape instead.
export function transcriptToText(content: unknown): string {
  if (!Array.isArray(content)) return typeof content === "string" ? content : JSON.stringify(content);
  return content
    .map((segment: unknown) => {
      const s = segment as { speaker?: string; words?: Array<{ text?: string }> };
      const speaker = s.speaker ?? "Unknown";
      const text = (s.words ?? []).map((w) => w.text ?? "").join(" ").trim();
      return text ? `${speaker}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// Real Recall transcript segment shape (one per contiguous chunk Recall
// produced, not necessarily one per full speaker turn — the same speaker
// can appear across several consecutive segments, hence the merge step in
// buildTranscriptJson below). Verified against live transcript downloads.
type RecallTranscriptWord = {
  text?: string;
  start_timestamp?: { relative?: number | null } | null;
  end_timestamp?: { relative?: number | null } | null;
};
type RecallTranscriptParticipant = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
};
type RecallTranscriptSegment = {
  participant?: RecallTranscriptParticipant | null;
  words?: RecallTranscriptWord[];
};

export type TranscriptJson = {
  turns: Array<{
    speaker_id: string;
    speaker_name_raw: string | null;
    start_ms: number;
    end_ms: number;
    text: string;
  }>;
  total_duration_ms: number;
};

// Normalizes a raw Recall transcript into speaker-turns with millisecond
// timestamps, for calls.transcript_json. A "turn" is a run of consecutive
// segments from the same participant merged into one — Recall itself splits
// a single speaker's uninterrupted talking into several segments (~27% of
// segments in a real sample were a same-speaker continuation of the
// previous one), so segment-per-turn would fragment the transcript far more
// than an actual conversation would.
export function buildTranscriptJson(recallTranscript: unknown): TranscriptJson {
  if (!Array.isArray(recallTranscript)) return { turns: [], total_duration_ms: 0 };

  type RawEntry = { speakerId: string; speakerNameRaw: string | null; startMs: number; endMs: number; text: string };

  const rawEntries: RawEntry[] = [];
  for (const segment of recallTranscript as RecallTranscriptSegment[]) {
    const words = segment.words ?? [];
    const text = words.map((w) => w.text ?? "").join(" ").trim();
    if (!text) continue;

    const participant = segment.participant ?? null;
    const speakerId = participant?.id != null ? String(participant.id) : "unknown";
    const startMs = Math.round((words[0]?.start_timestamp?.relative ?? 0) * 1000);
    const lastWordStartSeconds = (words[words.length - 1]?.end_timestamp?.relative ?? startMs / 1000) as number;
    const endMs = Math.max(startMs, Math.round(lastWordStartSeconds * 1000));

    rawEntries.push({
      speakerId,
      speakerNameRaw: participant?.name?.trim() || null,
      startMs,
      endMs,
      text,
    });
  }

  const turns: TranscriptJson["turns"] = [];
  for (const entry of rawEntries) {
    const last = turns[turns.length - 1];
    if (last && last.speaker_id === entry.speakerId) {
      last.text += ` ${entry.text}`;
      last.end_ms = entry.endMs;
      last.speaker_name_raw = last.speaker_name_raw ?? entry.speakerNameRaw;
    } else {
      turns.push({
        speaker_id: entry.speakerId,
        speaker_name_raw: entry.speakerNameRaw,
        start_ms: entry.startMs,
        end_ms: entry.endMs,
        text: entry.text,
      });
    }
  }

  const total_duration_ms = turns.reduce((max, t) => Math.max(max, t.end_ms), 0);
  return { turns, total_duration_ms };
}

export type SpeakerResolutionContext = {
  commercialName: string | null;
  commercialEmail: string | null;
  contactEmail: string | null;
  contactCompanyName: string | null;
};

// Resolves a { speaker_id: display_name } mapping once at ingestion, stored
// as the initial calls.speaker_names_override (the user can edit it
// afterwards; this never re-runs). Takes the RAW Recall transcript, not
// TranscriptJson — participant.email (needed for the email-match heuristic
// below) isn't part of the normalized TranscriptJson shape.
//
// Resolution order per speaker, most to least certain:
//  1. Recall's own speaker_name_raw (participant.name) — reliable when
//     present, e.g. sourced from Google Meet's own participant identity.
//  2. participant.email matched against the commercial's account email or
//     the call's known contact_email — deterministic, so tried before any
//     guess. (Originally specified as a match against
//     scheduled_meetings.raw.attendees[].email, but that data is never
//     persisted — scheduled_meetings only stores calendar_event_id/
//     event_title/event_start_at/bot_scheduled/ineligibility_reason, no
//     attendees — confirmed against the live schema. Matching against
//     calls.contact_email/company_name — already stored per-call — serves
//     the same purpose without a new migration; per user decision.)
//  3. Guess: the most-talkative still-unresolved speaker is plausibly the
//     commercial (the bot is invited by them, and demo-style calls tend to
//     skew toward the host talking more) — never certain, so only applied
//     once, and only if the commercial hasn't already been identified by 1
//     or 2 for a different speaker (otherwise two speakers could both end
//     up labeled with the commercial's name).
//  4. Whatever's left is genuinely unidentified.
export function resolveSpeakerNames(
  rawTranscript: unknown,
  callContext: SpeakerResolutionContext
): Record<string, string> {
  if (!Array.isArray(rawTranscript)) return {};

  type PerSpeaker = { speakerId: string; nameRaw: string | null; email: string | null; totalMs: number };
  const bySpeaker = new Map<string, PerSpeaker>();

  for (const segment of rawTranscript as RecallTranscriptSegment[]) {
    const words = segment.words ?? [];
    if (words.length === 0) continue;

    const participant = segment.participant ?? null;
    const speakerId = participant?.id != null ? String(participant.id) : "unknown";
    const startMs = Math.round((words[0]?.start_timestamp?.relative ?? 0) * 1000);
    const lastWordStartSeconds = (words[words.length - 1]?.end_timestamp?.relative ?? startMs / 1000) as number;
    const endMs = Math.max(startMs, Math.round(lastWordStartSeconds * 1000));
    const durationMs = endMs - startMs;

    const existing = bySpeaker.get(speakerId);
    if (existing) {
      existing.totalMs += durationMs;
      existing.nameRaw = existing.nameRaw ?? (participant?.name?.trim() || null);
      existing.email = existing.email ?? (participant?.email?.trim() || null);
    } else {
      bySpeaker.set(speakerId, {
        speakerId,
        nameRaw: participant?.name?.trim() || null,
        email: participant?.email?.trim() || null,
        totalMs: durationMs,
      });
    }
  }

  const result: Record<string, string> = {};
  const unresolved: PerSpeaker[] = [];

  for (const speaker of bySpeaker.values()) {
    if (speaker.nameRaw) {
      result[speaker.speakerId] = speaker.nameRaw;
    } else if (speaker.email && callContext.commercialEmail && speaker.email === callContext.commercialEmail) {
      result[speaker.speakerId] = callContext.commercialName ?? "Commercial";
    } else if (speaker.email && callContext.contactEmail && speaker.email === callContext.contactEmail) {
      result[speaker.speakerId] = formatContactDisplayName(callContext.contactCompanyName, callContext.contactEmail);
    } else {
      unresolved.push(speaker);
    }
  }

  const commercialAlreadyIdentified =
    !!callContext.commercialName && Object.values(result).includes(callContext.commercialName);
  if (callContext.commercialName && !commercialAlreadyIdentified && unresolved.length > 0) {
    const topTalker = unresolved.reduce((a, b) => (b.totalMs > a.totalMs ? b : a));
    result[topTalker.speakerId] = callContext.commercialName;
    unresolved.splice(unresolved.indexOf(topTalker), 1);
  }

  for (const speaker of unresolved) {
    result[speaker.speakerId] = "Participant non identifié";
  }

  return result;
}

export async function getBotInfo(botId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${RECALL_BASE_URL}/bot/${botId}/`, {
    headers: recallHeaders(),
  });
  if (!res.ok) throw new Error(`Recall.AI bot info failed (${res.status})`);
  return res.json() as Promise<Record<string, unknown>>;
}

// Resolves the bot attached to a calendar event, when scheduled_meetings
// hasn't cached its recall_bot_id yet. calendar_event_id here is Recall's own
// event id (what we store), not the underlying provider's event id.
export async function getBotIdFromCalendarEvent(calendarEventId: string): Promise<string | null> {
  const res = await fetch(`${RECALL_API_V2}/calendar-events/${calendarEventId}/`, {
    headers: recallHeaders(),
  });
  if (!res.ok) throw new Error(`Recall.AI calendar-event lookup failed (${res.status})`);

  const data = await res.json() as { bots?: Array<{ bot_id?: string }> };
  return data.bots?.[0]?.bot_id ?? null;
}

export async function deleteRecallCalendar(calendarId: string): Promise<void> {
  const res = await fetch(`${RECALL_API_V2}/calendars/${calendarId}/`, {
    method: "DELETE",
    headers: recallHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.AI delete calendar failed (${res.status}): ${body}`);
  }
}

export async function getVideoUrl(botId: string): Promise<string | null> {
  const botInfo = await getBotInfo(botId);
  const recordings = botInfo.recordings as Array<Record<string, unknown>> | undefined;
  const first = recordings?.[0];
  const shortcuts = first?.media_shortcuts as Record<string, unknown> | undefined;
  const videoMixed = shortcuts?.video_mixed as Record<string, unknown> | undefined;
  const data = videoMixed?.data as Record<string, unknown> | undefined;
  return (data?.download_url as string) ?? null;
}

export async function createAsyncTranscript(recordingId: string): Promise<Record<string, unknown>> {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");

  const res = await fetch(
    `${RECALL_BASE_URL}/recording/${recordingId}/create_transcript/`,
    {
      method: "POST",
      headers: recallHeaders(),
      body: JSON.stringify({
        provider: { recallai_async: { language_code: "auto" } },
        diarization: { use_separate_streams_when_available: true },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.AI create_transcript failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

export async function getRecallStatus(): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(`${RECALL_BASE_URL}/bot/`, {
      method: "GET",
      headers: recallHeaders(),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    throw new Error(`Recall.AI unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
}
