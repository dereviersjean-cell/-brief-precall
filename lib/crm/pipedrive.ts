const PIPEDRIVE_OAUTH_BASE = "https://oauth.pipedrive.com/oauth";
const REDIRECT_URI = "https://brief-precall.vercel.app/api/crm/pipedrive/callback";

export function getPipedriveAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PIPEDRIVE_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `${PIPEDRIVE_OAUTH_BASE}/authorize?${params.toString()}`;
}

export type PipedriveTokens = {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  expires_in: number;
};

function basicAuthHeader(): string {
  const creds = `${process.env.PIPEDRIVE_CLIENT_ID}:${process.env.PIPEDRIVE_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

export async function exchangePipedriveCode(code: string): Promise<PipedriveTokens> {
  const res = await fetch(`${PIPEDRIVE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Pipedrive token exchange failed: ${data.error ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    api_domain: (data.api_domain as string) ?? "api.pipedrive.com",
    expires_in: (data.expires_in as number) ?? 3600,
  };
}

export async function refreshPipedriveToken(refreshToken: string): Promise<PipedriveTokens> {
  const res = await fetch(`${PIPEDRIVE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.PIPEDRIVE_CLIENT_ID!,
      client_secret: process.env.PIPEDRIVE_CLIENT_SECRET!,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[refreshPipedriveToken] status:", res.status, "body:", JSON.stringify(data));
    throw new Error(`Pipedrive token refresh failed: ${data.error ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string) ?? refreshToken,
    api_domain: (data.api_domain as string) ?? "api.pipedrive.com",
    expires_in: (data.expires_in as number) ?? 3600,
  };
}

export type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  org_name: string | null;
  person_name: string | null;
  close_time: string | null;
  won_time: string | null;
  add_time: string;
};

export async function getWonDeals(
  accessToken: string,
  apiDomain: string,
  limit = 50
): Promise<PipedriveDeal[]> {
  const params = new URLSearchParams({
    status: "won",
    limit: String(limit),
    sort: "won_time DESC",
  });

  const res = await fetch(`${apiDomain}/api/v1/deals?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as { success: boolean; data: unknown[] | null };
  if (!res.ok || !data.success) {
    throw new Error(`getWonDeals failed: ${res.status}`);
  }

  return (data.data ?? []) as PipedriveDeal[];
}

export type PipedriveDealDetail = PipedriveDeal & {
  person_email: string | null;
  org_id: number | null;
  notes?: string;
};

export async function getDealDetails(
  accessToken: string,
  apiDomain: string,
  dealId: number
): Promise<PipedriveDealDetail | null> {
  const res = await fetch(`${apiDomain}/api/v1/deals/${dealId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as { success: boolean; data: unknown | null };
  if (!res.ok || !data.success || !data.data) return null;

  const d = data.data as Record<string, unknown>;
  return {
    id: d.id as number,
    title: d.title as string,
    value: d.value as number,
    currency: d.currency as string,
    status: d.status as string,
    org_name: (d.org_name as string) ?? null,
    person_name: (d.person_name as string) ?? null,
    close_time: (d.close_time as string) ?? null,
    won_time: (d.won_time as string) ?? null,
    add_time: d.add_time as string,
    person_email: (d["cc_email"] as string) ?? null,
    org_id: (d.org_id as number) ?? null,
  };
}

export type PipedriveOrg = {
  id: number;
  name: string;
  people_count: number;
  open_deals_count: number;
  won_deals_count: number;
};

export async function searchCompany(
  accessToken: string,
  apiDomain: string,
  query: string
): Promise<PipedriveOrg[]> {
  const params = new URLSearchParams({
    term: query,
    item_type: "organization",
    limit: "10",
  });

  const res = await fetch(`${apiDomain}/api/v1/itemSearch?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as {
    success: boolean;
    data: { items: { item: unknown }[] } | null;
  };

  if (res.status === 401 || res.status === 403) {
    throw new Error(`searchCompany auth failed: ${res.status}`);
  }
  if (!res.ok || !data.success || !data.data) return [];

  return data.data.items.map((i) => i.item as PipedriveOrg);
}
