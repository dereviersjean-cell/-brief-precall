const REDIRECT_URI = "https://brief-precall.vercel.app/api/crm/hubspot/callback";
const SCOPES = "oauth crm.objects.deals.read crm.objects.contacts.read crm.objects.companies.read";

export function getHubspotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export type HubspotTokens = {
  access_token: string;
  refresh_token: string;
};

async function tokenRequest(body: Record<string, string>): Promise<HubspotTokens> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      ...body,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[hubspot] token request failed:", res.status, JSON.stringify(data));
    throw new Error(`HubSpot token request failed: ${data.message ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
  };
}

export async function exchangeHubspotCode(code: string): Promise<HubspotTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });
}

export async function refreshHubspotToken(refreshToken: string): Promise<HubspotTokens> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export type HubspotDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: string | null;
};

export async function getWonDeals(accessToken: string): Promise<HubspotDeal[]> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
          ],
        },
      ],
      properties: ["dealname", "amount", "closedate", "hs_object_id"],
      limit: 100,
    }),
  });

  if (res.status === 401) throw new Error("getWonDeals auth failed: 401");

  const data = (await res.json()) as { results?: unknown[] };
  if (!res.ok) throw new Error(`getWonDeals failed: ${res.status}`);

  return (data.results ?? []).map((d) => {
    const deal = d as { id: string; properties: Record<string, string | null> };
    return {
      id: deal.id,
      dealname: deal.properties.dealname ?? null,
      amount: deal.properties.amount ?? null,
      closedate: deal.properties.closedate ?? null,
    };
  });
}

export type HubspotCompany = {
  id: string;
  name: string | null;
  industry: string | null;
  city: string | null;
  numberofemployees: string | null;
  annualrevenue: string | null;
};

export async function searchCompany(
  accessToken: string,
  companyName: string
): Promise<HubspotCompany[]> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: companyName,
      limit: 5,
      properties: ["name", "industry", "city", "numberofemployees", "annualrevenue"],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`searchCompany auth failed: ${res.status}`);
  }
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: unknown[] };
  return (data.results ?? []).map((c) => {
    const company = c as { id: string; properties: Record<string, string | null> };
    return {
      id: company.id,
      name: company.properties.name ?? null,
      industry: company.properties.industry ?? null,
      city: company.properties.city ?? null,
      numberofemployees: company.properties.numberofemployees ?? null,
      annualrevenue: company.properties.annualrevenue ?? null,
    };
  });
}
