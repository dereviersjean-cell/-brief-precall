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

export async function createRecallCalendarV2(
  userId: string,
  refreshToken: string
): Promise<RecallCalendarV2> {
  const oauthClientId = process.env.RECALL_GOOGLE_CLIENT_ID;
  const oauthClientSecret = process.env.RECALL_GOOGLE_CLIENT_SECRET;

  if (!oauthClientId || !oauthClientSecret) {
    throw new Error("RECALL_GOOGLE_CLIENT_ID or RECALL_GOOGLE_CLIENT_SECRET is not set.");
  }

  const res = await fetch("https://eu-central-1.recall.ai/api/v2/calendars/", {
    method: "POST",
    headers: recallHeaders(),
    body: JSON.stringify({
      platform: "google_calendar",
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

export async function syncAndScheduleForUser(
  userId: string,
  userEmail: string
): Promise<SyncResult> {
  const { getRecallCalendarId } = await import("./db");

  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not set");

  const calendarId = await getRecallCalendarId(userId);
  if (!calendarId) {
    console.log(`[sync] userId ${userId} has no recall_calendar_id, skipping`);
    return { checked: 0, scheduled: 0, skipped: 0 };
  }

  const userDomain = userEmail.split("@")[1] ?? "";
  const now = new Date().toISOString();

  const eventsRes = await fetch(
    `${RECALL_API_V2}/calendar-events/?calendar_id=${calendarId}&start_time__gte=${encodeURIComponent(now)}`,
    { headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" } }
  );
  if (!eventsRes.ok) throw new Error(`Recall.AI calendar-events error (${eventsRes.status})`);

  const eventsData = await eventsRes.json() as { results?: CalendarEvent[] };
  const events = eventsData.results ?? [];
  console.log(`[sync] userId ${userId} — ${events.length} upcoming events`);

  let scheduled = 0;
  let skipped = 0;

  for (const event of events) {
    const logPrefix = `[sync] event ${event.id}`;

    if (!event.meeting_url) { console.log(logPrefix, "skipped — no meeting_url"); skipped++; continue; }

    const attendees: Attendee[] = event.raw?.attendees ?? [];

    const hasExternal = attendees.some((a) => (a.email?.split("@")[1] ?? "") !== userDomain);
    if (!hasExternal) { console.log(logPrefix, "skipped — no external attendee"); skipped++; continue; }

    const userAttendee = attendees.find((a) => a.self === true || a.email === userEmail);
    if (!userAttendee || userAttendee.responseStatus !== "accepted") {
      console.log(logPrefix, "skipped — user not accepted:", userAttendee?.responseStatus ?? "not found");
      skipped++; continue;
    }

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
