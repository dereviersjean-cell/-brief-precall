// Un seul renouvellement à la fois par jeton dans une même instance : au
// chargement d'une page, plusieurs appels serveur peuvent constater en même
// temps que le jeton a expiré.
const inFlightRefresh = new Map<string, Promise<string>>();
export function refreshGoogleAccessTokenOnce(refreshToken: string): Promise<string> {
  const pending = inFlightRefresh.get(refreshToken);
  if (pending) return pending;
  const p = refreshGoogleAccessToken(refreshToken).finally(() => inFlightRefresh.delete(refreshToken));
  inFlightRefresh.set(refreshToken, p);
  return p;
}

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
