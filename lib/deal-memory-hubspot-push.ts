import {
  getCallDealMemory,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotUserForOrganization,
  getOrganizationHubspotMapping,
  markDealMemoryPushed,
  setDealHubspot,
  type CallWithAnalysis,
} from "./db";
import { buildHubspotNote, buildHubspotProperties, effectiveMapping } from "./deal-memory-hubspot";
import { getHubSpotDealSnapshot, pushToHubSpotDeal } from "./crm/hubspot-deals";

// Écrit la fiche d'un call dans le deal HubSpot rattaché : les champs de
// qualification réglés pour l'organisation, et une note de synthèse remplacée
// à chaque envoi du même call. Partagé par le bouton de la fiche et l'envoi
// automatique après chaque call (lib/inngest-functions.ts).

export type HubspotPushResult =
  | { status: "pushed"; pushedAt: string; properties: string[] }
  | { status: "skipped"; reason: "no-fiche" | "no-hubspot-deal" | "no-hubspot-user" };

export const HUBSPOT_SKIP_MESSAGES: Record<Extract<HubspotPushResult, { status: "skipped" }>["reason"], string> = {
  "no-fiche": "Générez d'abord la fiche de ce call.",
  "no-hubspot-deal": "Ce call n'est rattaché à aucun deal HubSpot.",
  "no-hubspot-user": "Personne n'a connecté HubSpot dans votre équipe.",
};

export async function pushDealMemoryToHubSpot(
  call: CallWithAnalysis,
  organizationId: string,
  preferredUserIds: string[]
): Promise<HubspotPushResult> {
  const fiche = await getCallDealMemory(call.id);
  if (!fiche) return { status: "skipped", reason: "no-fiche" };
  const hubspotDealId = fiche.dealId ? await getDealHubspotId(fiche.dealId) : null;
  if (!fiche.dealId || !hubspotDealId) return { status: "skipped", reason: "no-hubspot-deal" };
  const hubspotUser = await getHubspotUserForOrganization(organizationId, preferredUserIds);
  if (!hubspotUser) return { status: "skipped", reason: "no-hubspot-user" };

  const [overview, objections, orgMapping] = await Promise.all([
    getDealOverview(fiche.dealId, call.id),
    getDealMemoryObjections(call.id),
    getOrganizationHubspotMapping(organizationId),
  ]);
  const callAt = call.started_at ?? call.created_at;
  const properties = buildHubspotProperties(overview?.memory ?? {}, effectiveMapping(orgMapping));
  const noteHtml = buildHubspotNote({
    callTitle: call.meeting_title,
    callDay: new Date(callAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }),
    content: fiche,
    badlyHandledObjections: objections
      .filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement")
      .map((o) => o.objection),
  });

  await pushToHubSpotDeal(hubspotUser, hubspotDealId, { properties, noteHtml, uid: `brief-deal-memory-${call.id}` });
  const pushedAt = await markDealMemoryPushed(call.id);

  // Le deal vient de changer côté HubSpot : sa photo est relue.
  const snapshot = await getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null);
  if (snapshot) await setDealHubspot(fiche.dealId, snapshot);

  return { status: "pushed", pushedAt, properties: Object.keys(properties) };
}
