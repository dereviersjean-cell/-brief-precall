import {
  getCallDealMemory,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotPushHistory,
  getHubspotUserForOrganization,
  getLastBriefWrites,
  getRecentHubspotWrites,
  getOrganizationHubspotMapping,
  getUserName,
  isHubspotAutoPushEnabled,
  type HubspotPushEntry,
  type HubspotWriteEntry,
} from "./db";
import { getHubSpotDealSnapshot, getHubSpotDealValues, getHubspotPortalId, listHubSpotDealProperties, type HubspotDealPropertyFull } from "./crm/hubspot-deals";
import { buildHubspotNote, effectiveMapping } from "./deal-memory-hubspot";
import { briefCandidates, coerceMapping, mergeWritten, planWrites, type HubspotMapping, type PlannedWrite, type PropertyDefinition } from "./hubspot-mapping";
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
  // Le réglage complet de chaque propriété reliée (type, mode, options).
  entries: HubspotMapping;
  history: (HubspotPushEntry & { ownerName: string | null })[];
  // Le dernier envoi, rejoué à blanc avec les réglages et les valeurs
  // actuelles du deal : ce que le moteur écrirait, et pourquoi pas ailleurs.
  example: { dealName: string | null; callTitle: string | null; callDay: string | null; pushedAt: string; plans: PlannedWrite[]; noteHtml: string } | null;
  // Journal des écritures (migration 038), du plus récent au plus ancien.
  journal: HubspotWriteEntry[];
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
  const entries = coerceMapping(orgMapping);

  const names = new Map<string, string | null>();
  for (const id of new Set([hubspotUser, ...history.map((h) => h.ownerId)].filter((x): x is string => !!x))) {
    names.set(id, await getUserName(id).catch(() => null));
  }

  let all: HubspotDealPropertyFull[] = [];
  let portalId: number | null = null;
  let propertiesError = false;
  if (hubspotUser) {
    try {
      [all, portalId] = await Promise.all([listHubSpotDealProperties(hubspotUser), getHubspotPortalId(hubspotUser).catch(() => null)]);
    } catch {
      propertiesError = true;
    }
  }
  // Le choix du manager se fait parmi les propriétés texte, nombre et date
  // modifiables ; les listes se règlent au setup avec leurs options. Une
  // propriété déjà reliée reste affichée quel que soit son type.
  const linked = new Set(Object.values(entries).map((e) => e!.property));
  const properties: HubspotProperty[] = all
    .filter((p) => (!p.readOnly && ["string", "number", "date", "datetime"].includes(p.type)) || linked.has(p.name))
    .map((p) => ({ name: p.name, label: p.label }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return {
    connected: !!hubspotUser,
    connectedAs: hubspotUser ? names.get(hubspotUser) ?? null : null,
    portalId,
    autoPush,
    properties,
    mapping,
    entries,
    history: history.map((h) => ({ ...h, ownerName: h.ownerId ? names.get(h.ownerId) ?? null : null })),
    example: hubspotUser && !propertiesError ? await buildExample(history[0], entries, all, hubspotUser).catch(() => null) : null,
    journal: await getRecentHubspotWrites(organizationId).catch(() => []),
    propertiesError,
  };
}

// Le dernier envoi, rejoué à blanc avec les réglages et les valeurs actuelles
// du deal : rien n'est écrit.
async function buildExample(
  last: HubspotPushEntry | undefined,
  mapping: HubspotMapping,
  all: HubspotDealPropertyFull[],
  hubspotUser: string
): Promise<HubspotOverview["example"]> {
  if (!last?.dealId) return null;
  const hubspotDealId = await getDealHubspotId(last.dealId);
  if (!hubspotDealId) return null;
  const definitions: Record<string, PropertyDefinition> = Object.fromEntries(
    all.map((p) => [p.name, { type: p.type, options: p.options.map((o) => o.value), readOnly: p.readOnly }])
  );
  const linked = [...new Set(Object.values(mapping).map((e) => e!.property))].filter((name) => name in definitions);
  const [fiche, overview, objections, current, lastWritten, snapshot] = await Promise.all([
    getCallDealMemory(last.callId),
    getDealOverview(last.dealId, last.callId),
    getDealMemoryObjections(last.callId),
    getHubSpotDealValues(hubspotUser, hubspotDealId, linked),
    getLastBriefWrites(hubspotDealId),
    getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null),
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
    plans: planWrites({
      mapping,
      memory: overview?.memory ?? {},
      current,
      lastWritten: mergeWritten(lastWritten, briefCandidates(mapping, overview?.memory ?? {})),
      definitions,
      dealClosed: snapshot?.closed ?? false,
    }),
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
