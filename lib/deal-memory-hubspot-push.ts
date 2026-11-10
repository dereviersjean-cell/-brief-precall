import {
  getCallDealMemory,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotUserForOrganization,
  getLastBriefWrites,
  getOrganizationHubspotAutofill,
  getOrganizationHubspotMapping,
  markDealMemoryPushed,
  recordHubspotWrites,
  setDealHubspot,
  type CallWithAnalysis,
} from "./db";
import { buildHubspotNote } from "./deal-memory-hubspot";
import { briefCandidates, coerceMapping, mergeWritten, planWrites, type HubspotMapping, type PlannedWrite, type PropertyDefinition } from "./hubspot-mapping";
import { getHubSpotDealSnapshot, getHubSpotDealValues, listHubSpotDealProperties, pushToHubSpotDeal } from "./crm/hubspot-deals";
import { updateHubSpotObject } from "./crm/hubspot-objects";
import { coerceAutofillConfig, linkId, type AutofillPlan } from "./hubspot-autofill";
import { prepareAutofill, type PreparedAutofill } from "./hubspot-autofill-run";
import { reportError } from "./monitoring";
import type { HubspotDealSnapshot } from "./deal-memory-schema";

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
//
// Depuis le 10/11/2026, une organisation dont le manager a validé la mise à
// jour automatique (Paramètres › HubSpot, lib/hubspot-autofill.ts) passe par
// elle à la place : deal, contact et entreprise, chaque valeur lue dans le
// call avec le passage qui la prouve. L'ancien réglage (hubspot_field_mapping)
// ne sert alors plus ; la note de synthèse ne change pas.

export type HubspotPushResult =
  | { status: "pushed"; pushedAt: string; properties: string[]; plans: PlannedWrite[]; autofill?: AutofillPlan[] }
  | { status: "skipped"; reason: "no-fiche" | "no-hubspot-deal" | "no-hubspot-user" };

export const HUBSPOT_SKIP_MESSAGES: Record<Extract<HubspotPushResult, { status: "skipped" }>["reason"], string> = {
  "no-fiche": "Générez d'abord la fiche de ce call.",
  "no-hubspot-deal": "Ce call n'est rattaché à aucun deal HubSpot.",
  "no-hubspot-user": "Personne n'a connecté HubSpot dans votre équipe.",
};

type CallMeta = Pick<CallWithAnalysis, "id" | "meeting_title" | "started_at" | "created_at">;

type Prepared = {
  hubspotUser: string;
  hubspotDealId: string;
  dealId: string;
  plans: PlannedWrite[];
  properties: Record<string, string>;
  noteHtml: string;
  before: HubspotDealSnapshot | null;
};

// Tout ce qu'un envoi écrirait, sans rien écrire. `override` : un réglage à
// essayer (setup admin) ; `planned` : les propriétés Brief qui seront créées,
// tenues pour existantes et vides.
async function prepareHubspotPush(
  call: CallMeta,
  organizationId: string,
  preferredUserIds: string[],
  override?: { mapping: HubspotMapping; planned: string[] }
): Promise<Prepared | Extract<HubspotPushResult, { status: "skipped" }>> {
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
  const mapping = override?.mapping ?? coerceMapping(orgMapping);
  const definitions: Record<string, PropertyDefinition> = Object.fromEntries(
    propertyList.map((p) => [p.name, { type: p.type, options: p.options.map((o) => o.value), readOnly: p.readOnly }])
  );
  for (const name of override?.planned ?? []) definitions[name] ??= { type: "string", options: [], readOnly: false };
  const existing = new Set(propertyList.map((p) => p.name));
  const linked = [...new Set(Object.values(mapping).map((e) => e!.property))].filter((name) => existing.has(name));
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
  return { hubspotUser, hubspotDealId, dealId: fiche.dealId, plans, properties, noteHtml, before };
}

// Le setup admin : ce qu'un envoi de ce call écrirait avec un réglage à
// l'essai. Rien n'est écrit.
export async function simulateHubspotPush(
  call: CallMeta,
  organizationId: string,
  override: { mapping: HubspotMapping; planned: string[] }
): Promise<{ plans: PlannedWrite[]; noteHtml: string } | Extract<HubspotPushResult, { status: "skipped" }>> {
  const prepared = await prepareHubspotPush(call, organizationId, [], override);
  return "status" in prepared ? prepared : { plans: prepared.plans, noteHtml: prepared.noteHtml };
}

export async function pushDealMemoryToHubSpot(
  call: CallWithAnalysis,
  organizationId: string,
  preferredUserIds: string[]
): Promise<HubspotPushResult> {
  const config = coerceAutofillConfig(await getOrganizationHubspotAutofill(organizationId));
  const autofillOn = !!config?.active && config.links.some((l) => l.enabled);
  // Mise à jour automatique active : l'ancien réglage ne s'applique pas.
  const prepared = await prepareHubspotPush(call, organizationId, preferredUserIds, autofillOn ? { mapping: {}, planned: [] } : undefined);
  if ("status" in prepared) return prepared;
  const { hubspotUser, hubspotDealId, dealId, plans, noteHtml, before } = prepared;
  const uid = `brief-deal-memory-${call.id}`;

  // Un échec de la lecture du call par le modèle ne prive pas le deal de sa
  // note : elle part seule, et l'erreur est signalée.
  let autofill: PreparedAutofill | null = null;
  if (autofillOn) {
    try {
      autofill = await prepareAutofill({ call, config: config!, hubspotUser, hubspotDealId, snapshot: before });
    } catch (err) {
      reportError("hubspot-autofill.prepare", err, { callId: call.id });
    }
  }
  const refuse = (object: AutofillPlan["object"]) => {
    for (const p of autofill?.plans ?? []) if (p.object === object && p.action === "write") Object.assign(p, { action: "skip", reason: "Écriture refusée par HubSpot" });
  };

  const properties = autofill ? autofill.updates.deal : prepared.properties;
  try {
    await pushToHubSpotDeal(hubspotUser, hubspotDealId, { properties, noteHtml, uid });
  } catch (err) {
    if (!autofill || Object.keys(properties).length === 0) throw err;
    // HubSpot a refusé une valeur : la note part quand même.
    reportError("hubspot-autofill.deal", err, { callId: call.id });
    refuse("deal");
    await pushToHubSpotDeal(hubspotUser, hubspotDealId, { properties: {}, noteHtml, uid });
  }
  for (const object of ["contact", "company"] as const) {
    const id = autofill?.ids[object];
    if (!autofill || !id || Object.keys(autofill.updates[object]).length === 0) continue;
    try {
      await updateHubSpotObject(hubspotUser, object, id, autofill.updates[object]);
    } catch (err) {
      reportError(`hubspot-autofill.${object}`, err, { callId: call.id });
      refuse(object);
    }
  }

  const pushedAt = await markDealMemoryPushed(call.id);
  await recordHubspotWrites(
    autofill
      ? autofill.plans.map((p) => ({
          organizationId,
          callId: call.id,
          dealId,
          hubspotDealId,
          field: linkId(p),
          property: p.property,
          oldValue: p.current,
          newValue: p.value,
          status: p.action === "write" ? ("written" as const) : ("skipped" as const),
          reason: p.reason,
          objectType: p.object,
          objectId: autofill!.ids[p.object],
        }))
      : plans.map((p) => ({
          organizationId,
          callId: call.id,
          dealId,
          hubspotDealId,
          field: p.key,
          property: p.property,
          oldValue: p.current,
          newValue: p.value,
          status: p.action === "write" ? ("written" as const) : ("skipped" as const),
          reason: p.reason,
        }))
  );

  // Le deal vient de changer côté HubSpot : sa photo est relue.
  const snapshot = await getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null);
  if (snapshot) await setDealHubspot(dealId, snapshot);

  const written = autofill ? autofill.plans.filter((p) => p.action === "write").map((p) => p.label) : Object.keys(properties);
  return { status: "pushed", pushedAt, properties: written, plans, ...(autofill ? { autofill: autofill.plans } : {}) };
}
