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
      webhook_url: "https://brief-precall.vercel.app/api/recall/webhook",
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
