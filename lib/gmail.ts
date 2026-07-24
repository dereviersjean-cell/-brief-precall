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

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

type GmailMetadataMessage = {
  payload: { headers: { name: string; value: string }[] };
  internalDate?: string;
};

export type ThreadReplyResult =
  | { replied: true; repliedAt: string; messageId: string }
  | { replied: false };

// format=metadata (not full) — gmail.readonly was dropped from the OAuth
// scope (25/07/2026, avoid the paid CASA audit required for Restricted
// scopes); gmail.metadata only grants headers, never the message body. This
// still answers "did they reply, and when" — it just can't return what they
// wrote anymore. metadataHeaders must be requested explicitly.
export async function checkThreadReply(
  accessToken: string,
  threadId: string,
  contactEmail: string,
  sentAfter: string
): Promise<ThreadReplyResult> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-Id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Gmail get thread failed (${res.status}): ${await res.text()}`);
  }

  const thread = await res.json() as { messages?: GmailMetadataMessage[] };
  const messages = thread.messages ?? [];
  const sentAfterMs = new Date(sentAfter).getTime();

  let found: { repliedAt: string; messageId: string } | null = null;
  for (const msg of messages) {
    const headers = msg.payload.headers;
    const from = getHeader(headers, "From");
    if (!from.toLowerCase().includes(contactEmail.toLowerCase())) continue;

    const dateHeader = getHeader(headers, "Date");
    const dateMs = dateHeader ? new Date(dateHeader).getTime() : (msg.internalDate ? parseInt(msg.internalDate) : 0);
    if (dateMs <= sentAfterMs) continue;

    const repliedAt = dateHeader || new Date(dateMs).toISOString();
    const messageId = getHeader(headers, "Message-Id") || getHeader(headers, "Message-ID");
    found = { repliedAt, messageId };
  }

  if (!found) return { replied: false };
  return { replied: true, repliedAt: found.repliedAt, messageId: found.messageId };
}
