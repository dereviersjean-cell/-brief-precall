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
