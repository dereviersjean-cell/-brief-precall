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
