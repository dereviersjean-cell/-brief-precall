import { getHubspotUserForOrganization, getOpenHubspotDeals, saveOrganizationPipelineStats, setDealHubspot } from "./db";
import { getHubSpotDealSnapshot, getHubSpotPipelineStats } from "./crm/hubspot-deals";
import { reportWarning } from "./monitoring";

// Deal Execution, étape 6 (27/10/2026) : chaque matin, avant l'email de 8 h,
// on relit HubSpot pour une organisation — le parcours mesuré sur l'année
// (durée habituelle et taux de passage par étape) et la photo des deals
// suivis encore ouverts, dont l'étape bouge dans HubSpot sans nouveau call.
// Lecture seule. Partagé par le cron (lib/inngest-functions.ts) et
// scripts/refresh-deal-pipelines.ts.
export async function refreshDealPipelinesForOrganization(
  organizationId: string
): Promise<{ hubspot: boolean; pipelines: number; deals: number; refreshed: number }> {
  const userId = await getHubspotUserForOrganization(organizationId, []);
  if (!userId) return { hubspot: false, pipelines: 0, deals: 0, refreshed: 0 };

  const stats = await getHubSpotPipelineStats(userId, Date.now());
  await saveOrganizationPipelineStats(organizationId, stats);

  const deals = await getOpenHubspotDeals(organizationId);
  let refreshed = 0;
  for (const deal of deals) {
    try {
      const snapshot = await getHubSpotDealSnapshot(userId, deal.hubspotDealId);
      if (snapshot) {
        await setDealHubspot(deal.id, snapshot);
        refreshed++;
      }
    } catch (err) {
      reportWarning("deal-pipeline.snapshot", err, { dealId: deal.id });
    }
  }
  return { hubspot: true, pipelines: stats.length, deals: stats.reduce((n, p) => n + p.dealCount, 0), refreshed };
}
