import { getCrmTokens, saveCrmTokens } from "@/lib/db";
import { searchCompany as pipedriveSearch, refreshPipedriveToken } from "@/lib/crm/pipedrive";
import { searchCompany as hubspotSearch, refreshHubspotToken } from "@/lib/crm/hubspot";
import type { PipedriveOrg } from "@/lib/crm/pipedrive";
import type { HubspotCompany } from "@/lib/crm/hubspot";

export type CrmEnrichment = {
  source: "pipedrive" | "hubspot";
  company_name: string;
  owner_name: string | null;
  deals_count: number;
  latest_deal_value: string | null;
  latest_deal_title: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

function buildFromPipedrive(org: PipedriveOrg): CrmEnrichment {
  return {
    source: "pipedrive",
    company_name: org.name,
    owner_name: null,
    deals_count: (org.open_deals_count ?? 0) + (org.won_deals_count ?? 0),
    latest_deal_value: null,
    latest_deal_title: null,
    contact_name: null,
    contact_email: null,
  };
}

function buildFromHubspot(company: HubspotCompany): CrmEnrichment {
  return {
    source: "hubspot",
    company_name: company.name ?? "",
    owner_name: null,
    deals_count: 0,
    latest_deal_value: null,
    latest_deal_title: null,
    contact_name: null,
    contact_email: null,
  };
}

async function enrichFromPipedrive(
  userId: string,
  companyName: string
): Promise<CrmEnrichment | null> {
  const tokens = await getCrmTokens(userId, "pipedrive");
  if (!tokens) return null;

  const apiDomain = tokens.api_domain ?? "api.pipedrive.com";

  async function doSearch(accessToken: string): Promise<PipedriveOrg[]> {
    return pipedriveSearch(accessToken, apiDomain, companyName);
  }

  let results: PipedriveOrg[];
  try {
    results = await doSearch(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401") && !msg.includes("403")) {
      console.warn("[enrichFromCRM/pipedrive] searchCompany failed:", msg);
      return null;
    }

    let newTokens: Awaited<ReturnType<typeof refreshPipedriveToken>>;
    try {
      newTokens = await refreshPipedriveToken(tokens.refresh_token);
    } catch (refreshErr) {
      console.warn("[enrichFromCRM/pipedrive] Token refresh failed:", refreshErr instanceof Error ? refreshErr.message : String(refreshErr));
      return null;
    }

    try {
      await saveCrmTokens(userId, "pipedrive", newTokens.access_token, newTokens.refresh_token, newTokens.api_domain);
    } catch (saveErr) {
      console.warn("[enrichFromCRM/pipedrive] saveCrmTokens after refresh failed:", saveErr);
    }

    try {
      results = await doSearch(newTokens.access_token);
    } catch (retryErr) {
      console.warn("[enrichFromCRM/pipedrive] searchCompany retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr));
      return null;
    }
  }

  if (results.length === 0) return null;
  return buildFromPipedrive(results[0]);
}

async function enrichFromHubspot(
  userId: string,
  companyName: string
): Promise<CrmEnrichment | null> {
  const tokens = await getCrmTokens(userId, "hubspot");
  if (!tokens) return null;

  async function doSearch(accessToken: string): Promise<HubspotCompany[]> {
    return hubspotSearch(accessToken, companyName);
  }

  let results: HubspotCompany[];
  try {
    results = await doSearch(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401") && !msg.includes("403")) {
      console.warn("[enrichFromCRM/hubspot] searchCompany failed:", msg);
      return null;
    }

    let newTokens: Awaited<ReturnType<typeof refreshHubspotToken>>;
    try {
      newTokens = await refreshHubspotToken(tokens.refresh_token);
    } catch (refreshErr) {
      console.warn("[enrichFromCRM/hubspot] Token refresh failed:", refreshErr instanceof Error ? refreshErr.message : String(refreshErr));
      return null;
    }

    try {
      await saveCrmTokens(userId, "hubspot", newTokens.access_token, newTokens.refresh_token);
    } catch (saveErr) {
      console.warn("[enrichFromCRM/hubspot] saveCrmTokens after refresh failed:", saveErr);
    }

    try {
      results = await doSearch(newTokens.access_token);
    } catch (retryErr) {
      console.warn("[enrichFromCRM/hubspot] searchCompany retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr));
      return null;
    }
  }

  if (results.length === 0) return null;
  return buildFromHubspot(results[0]);
}

export async function enrichFromCRM(
  userId: string,
  companyName: string
): Promise<CrmEnrichment | null> {
  const pipedriveResult = await enrichFromPipedrive(userId, companyName);
  if (pipedriveResult) return pipedriveResult;

  return enrichFromHubspot(userId, companyName);
}
