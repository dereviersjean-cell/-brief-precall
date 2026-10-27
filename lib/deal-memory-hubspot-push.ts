import {
  getCallDealMemory,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotUserForOrganization,
  getLastBriefWrites,
  getOrganizationHubspotMapping,
  markDealMemoryPushed,
  recordHubspotWrites,
  setDealHubspot,
  type CallWithAnalysis,
} from "./db";
import { buildHubspotNote } from "./deal-memory-hubspot";
import { briefCandidates, coerceMapping, mergeWritten, planWrites, type PlannedWrite, type PropertyDefinition } from "./hubspot-mapping";
import { getHubSpotDealSnapshot, getHubSpotDealValues, listHubSpotDealProperties, pushToHubSpotDeal } from "./crm/hubspot-deals";

// Écrit la fiche d'un call dans le deal HubSpot rattaché. Partagé par le bouton
// de la fiche et l'envoi automatique après chaque call
// (lib/inngest-functions.ts).
//
// Depuis le 27/10/2026, les propriétés passent par le moteur de
// lib/hubspot-mapping.ts : avant d'écrire, Brief relit les propriétés du
// HubSpot du client (existence, type, options) et les valeurs actuelles du
// deal, n'écrit que l'information confirmée, au bon format, en « remplir si
// vide » par défaut — et journalise chaque décision (migration 038). La note
// de synthèse, elle, est toujours posée (remplacée à chaque envoi du même
// call).

export type HubspotPushResult =
  | { status: "pushed"; pushedAt: string; properties: string[]; plans: PlannedWrite[] }
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

  const [overview, objections, orgMapping, propertyList, lastWritten, before] = await Promise.all([
    getDealOverview(fiche.dealId, call.id),
    getDealMemoryObjections(call.id),
    getOrganizationHubspotMapping(organizationId),
    listHubSpotDealProperties(hubspotUser),
    getLastBriefWrites(hubspotDealId),
    getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null),
  ]);
  const mapping = coerceMapping(orgMapping);
  const definitions: Record<string, PropertyDefinition> = Object.fromEntries(
    propertyList.map((p) => [p.name, { type: p.type, options: p.options.map((o) => o.value), readOnly: p.readOnly }])
  );
  const linked = [...new Set(Object.values(mapping).map((e) => e!.property))].filter((name) => name in definitions);
  const current = await getHubSpotDealValues(hubspotUser, hubspotDealId, linked);
  const plans = planWrites({
    mapping,
    memory: overview?.memory ?? {},
    current,
    lastWritten: mergeWritten(lastWritten, briefCandidates(mapping, overview?.memory ?? {})),
    definitions,
    dealClosed: before?.closed ?? false,
  });
  const properties = Object.fromEntries(plans.filter((p) => p.action === "write").map((p) => [p.property, p.value as string]));

  const callAt = call.started_at ?? call.created_at;
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
  await recordHubspotWrites(
    plans.map((p) => ({
      organizationId,
      callId: call.id,
      dealId: fiche.dealId,
      hubspotDealId,
      field: p.key,
      property: p.property,
      oldValue: p.current,
      newValue: p.value,
      status: p.action === "write" ? "written" : "skipped",
      reason: p.reason,
    }))
  );

  // Le deal vient de changer côté HubSpot : sa photo est relue.
  const snapshot = await getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null);
  if (snapshot) await setDealHubspot(fiche.dealId, snapshot);

  return { status: "pushed", pushedAt, properties: Object.keys(properties), plans };
}
