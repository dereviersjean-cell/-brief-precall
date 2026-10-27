import {
  getCallDealMemory,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotPushHistory,
  getHubspotUserForOrganization,
  getOrganizationHubspotMapping,
  getUserName,
  isHubspotAutoPushEnabled,
  type HubspotPushEntry,
} from "./db";
import { getHubspotPortalId, listHubSpotDealTextProperties } from "./crm/hubspot-deals";
import { buildHubspotNote, buildHubspotProperties, effectiveMapping } from "./deal-memory-hubspot";
import type { DealMemoryFieldKey } from "./deal-memory-schema";
import type { HubspotProperty } from "./hubspot-overview";

// Ce que l'onglet HubSpot de Deals de l'équipe montre (27/10/2026) : la
// connexion, l'automatisation, les propriétés du HubSpot du client, la
// correspondance réglée, les derniers envois, et un exemple réel de ce que
// Brief écrit (le dernier envoi, recalculé avec les réglages actuels).

export type HubspotOverview = {
  connected: boolean;
  connectedAs: string | null;
  portalId: number | null;
  autoPush: boolean;
  properties: HubspotProperty[];
  mapping: Partial<Record<DealMemoryFieldKey, string>>;
  history: (HubspotPushEntry & { ownerName: string | null })[];
  example: { dealName: string | null; callTitle: string | null; callDay: string | null; pushedAt: string; properties: Record<string, string>; noteHtml: string } | null;
  // La lecture des propriétés HubSpot a échoué (jeton, réseau) : le reste
  // s'affiche quand même.
  propertiesError: boolean;
};

export async function loadHubspotOverview(organizationId: string, viewerId: string): Promise<HubspotOverview> {
  const [hubspotUser, orgMapping, autoPush, history] = await Promise.all([
    getHubspotUserForOrganization(organizationId, [viewerId]),
    getOrganizationHubspotMapping(organizationId),
    isHubspotAutoPushEnabled(organizationId),
    getHubspotPushHistory(organizationId).catch(() => [] as HubspotPushEntry[]),
  ]);
  const mapping = effectiveMapping(orgMapping);

  const names = new Map<string, string | null>();
  for (const id of new Set([hubspotUser, ...history.map((h) => h.ownerId)].filter((x): x is string => !!x))) {
    names.set(id, await getUserName(id).catch(() => null));
  }

  let properties: HubspotProperty[] = [];
  let portalId: number | null = null;
  let propertiesError = false;
  if (hubspotUser) {
    try {
      [properties, portalId] = await Promise.all([
        listHubSpotDealTextProperties(hubspotUser).then((list) => list.map((p) => ({ name: p.name, label: p.label }))),
        getHubspotPortalId(hubspotUser).catch(() => null),
      ]);
    } catch {
      propertiesError = true;
    }
  }

  return {
    connected: !!hubspotUser,
    connectedAs: hubspotUser ? names.get(hubspotUser) ?? null : null,
    portalId,
    autoPush,
    properties,
    mapping,
    history: history.map((h) => ({ ...h, ownerName: h.ownerId ? names.get(h.ownerId) ?? null : null })),
    example: await buildExample(history[0], mapping).catch(() => null),
    propertiesError,
  };
}

// Le dernier envoi, tel qu'il partirait aujourd'hui avec les réglages actuels.
async function buildExample(last: HubspotPushEntry | undefined, mapping: Partial<Record<DealMemoryFieldKey, string>>): Promise<HubspotOverview["example"]> {
  if (!last?.dealId || !(await getDealHubspotId(last.dealId))) return null;
  const [fiche, overview, objections] = await Promise.all([
    getCallDealMemory(last.callId),
    getDealOverview(last.dealId, last.callId),
    getDealMemoryObjections(last.callId),
  ]);
  if (!fiche) return null;
  const callDay = fiche.callAt
    ? new Date(fiche.callAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })
    : null;
  return {
    dealName: last.dealName,
    callTitle: last.callTitle,
    callDay,
    pushedAt: last.pushedAt,
    properties: buildHubspotProperties(overview?.memory ?? {}, mapping),
    noteHtml: buildHubspotNote({
      callTitle: last.callTitle,
      callDay,
      content: fiche,
      badlyHandledObjections: objections
        .filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement")
        .map((o) => o.objection),
    }),
  };
}
