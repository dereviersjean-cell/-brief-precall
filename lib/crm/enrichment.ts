import { getCrmTokens, saveCrmTokens } from "@/lib/db";
import { searchCompany, refreshPipedriveToken } from "@/lib/crm/pipedrive";
import type { PipedriveOrg } from "@/lib/crm/pipedrive";

export type CrmEnrichment = {
  source: "pipedrive";
  company_name: string;
  owner_name: string | null;
  deals_count: number;
  latest_deal_value: string | null;
  latest_deal_title: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

function buildEnrichment(org: PipedriveOrg): CrmEnrichment {
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

export async function enrichFromCRM(
  userId: string,
  companyName: string
): Promise<CrmEnrichment | null> {
  console.log("[enrichFromCRM] searching for:", companyName);

  const tokens = await getCrmTokens(userId, "pipedrive");
  console.log("[enrichFromCRM] tokens found:", tokens !== null);
  if (!tokens) return null;

  const apiDomain = tokens.api_domain ?? "api.pipedrive.com";

  async function doSearch(accessToken: string): Promise<PipedriveOrg[]> {
    return searchCompany(accessToken, apiDomain, companyName);
  }

  let results: PipedriveOrg[];
  try {
    results = await doSearch(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401") && !msg.includes("403")) {
      console.warn("[enrichFromCRM] searchCompany failed:", msg);
      return null;
    }

    // Token expired — refresh and retry
    let newTokens: Awaited<ReturnType<typeof refreshPipedriveToken>>;
    try {
      newTokens = await refreshPipedriveToken(tokens.refresh_token);
    } catch (refreshErr) {
      console.warn("[enrichFromCRM] Token refresh failed:", refreshErr instanceof Error ? refreshErr.message : String(refreshErr));
      return null;
    }

    try {
      await saveCrmTokens(userId, "pipedrive", newTokens.access_token, newTokens.refresh_token, newTokens.api_domain);
    } catch (saveErr) {
      console.warn("[enrichFromCRM] saveCrmTokens after refresh failed:", saveErr);
    }

    try {
      results = await doSearch(newTokens.access_token);
    } catch (retryErr) {
      console.warn("[enrichFromCRM] searchCompany retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr), retryErr instanceof Error && retryErr.cause ? retryErr.cause : "");
      return null;
    }
  }

  console.log("[enrichFromCRM] results count:", results.length);

  if (results.length === 0) {
    console.log("[enrichFromCRM] returning null (no results)");
    return null;
  }

  const enrichment = buildEnrichment(results[0]);
  console.log("[enrichFromCRM] returning:", enrichment);
  return enrichment;
}
