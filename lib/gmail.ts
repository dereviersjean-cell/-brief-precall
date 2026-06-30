export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export type GmailMessage = {
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
};

function decodeBase64(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

type GmailPart = {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

function extractTextBody(part: GmailPart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64(part.body.data);
  }
  if (part.parts) {
    for (const child of part.parts) {
      const text = extractTextBody(child);
      if (text) return text;
    }
  }
  return "";
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

type GmailThreadMessage = {
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: GmailPart[];
    mimeType: string;
  };
  internalDate?: string;
};

export type ThreadReplyResult =
  | { replied: true; repliedAt: string; body: string }
  | { replied: false };

export async function checkThreadReply(
  accessToken: string,
  threadId: string,
  contactEmail: string,
  sentAfter: string
): Promise<ThreadReplyResult> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Gmail get thread failed (${res.status}): ${await res.text()}`);
  }

  const thread = await res.json() as { messages?: GmailThreadMessage[] };
  const messages = thread.messages ?? [];
  const sentAfterMs = new Date(sentAfter).getTime();

  // Find the last message from contactEmail after sentAfter
  let found: { repliedAt: string; body: string } | null = null;
  for (const msg of messages) {
    const headers = msg.payload.headers;
    const from = getHeader(headers, "From");
    if (!from.toLowerCase().includes(contactEmail.toLowerCase())) continue;

    const dateHeader = getHeader(headers, "Date");
    const dateMs = dateHeader ? new Date(dateHeader).getTime() : (msg.internalDate ? parseInt(msg.internalDate) : 0);
    if (dateMs <= sentAfterMs) continue;

    const body = extractTextBody(msg.payload as GmailPart).trim();
    const repliedAt = dateHeader || new Date(dateMs).toISOString();
    found = { repliedAt, body };
  }

  if (!found) return { replied: false };
  return { replied: true, repliedAt: found.repliedAt, body: found.body };
}

export async function getEmailHistory(
  accessToken: string,
  contactEmail: string
): Promise<GmailMessage[]> {
  const query = `from:${contactEmail} OR to:${contactEmail}`;
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    throw new Error(`Gmail list messages failed (${listRes.status}): ${await listRes.text()}`);
  }

  const listData = await listRes.json() as { messages?: { id: string }[] };
  const messageRefs = listData.messages ?? [];

  if (messageRefs.length === 0) return [];

  const messages = await Promise.all(
    messageRefs.map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) return null;

      const msg = await msgRes.json() as {
        payload: {
          headers: { name: string; value: string }[];
          body?: { data?: string };
          parts?: GmailPart[];
          mimeType: string;
        };
      };

      const headers = msg.payload.headers;
      const body = extractTextBody(msg.payload as GmailPart).trim();

      return {
        from: getHeader(headers, "From"),
        to: getHeader(headers, "To"),
        subject: getHeader(headers, "Subject"),
        date: getHeader(headers, "Date"),
        body,
      };
    })
  );

  return messages
    .filter((m): m is GmailMessage => m !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
