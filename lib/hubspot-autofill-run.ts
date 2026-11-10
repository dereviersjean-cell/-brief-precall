import { getLastAutofillWrites, getUserName, type CallWithAnalysis } from "./db";
import { buildDealMemoryLines } from "./deal-memory";
import type { HubspotDealSnapshot } from "./deal-memory-schema";
import { getHubspotTokenInfo, listHubSpotPipelines } from "./crm/hubspot-deals";
import { findDealTargets, getHubSpotObjectValues, listHubSpotProperties, type DealTargets } from "./crm/hubspot-objects";
import { extractAutofillValues } from "./hubspot-autofill-ai";
import {
  AUTOFILL_OBJECTS,
  linkId,
  planAutofill,
  type AutofillConfig,
  type AutofillObject,
  type AutofillPlan,
  type AutofillProperty,
  type StageContext,
} from "./hubspot-autofill";

// Ce que la mise à jour automatique écrirait pour un call, sans rien écrire :
// relit les propriétés du client et les valeurs actuelles du deal, du contact
// et de l'entreprise, demande au modèle ce que le call en dit, puis décide
// propriété par propriété (lib/hubspot-autofill.ts).

export const COMPANY_WRITE_SCOPE = "crm.objects.companies.write";
export const CONTACT_WRITE_SCOPE = "crm.objects.contacts.write";

export type PreparedAutofill = {
  plans: AutofillPlan[];
  // L'identifiant HubSpot de chaque objet touché.
  ids: Record<AutofillObject, string | null>;
  // Par objet : les propriétés à écrire.
  updates: Record<AutofillObject, Record<string, string>>;
};

export async function prepareAutofill(input: {
  call: CallWithAnalysis;
  config: AutofillConfig;
  hubspotUser: string;
  hubspotDealId: string;
  snapshot: HubspotDealSnapshot | null;
}): Promise<PreparedAutofill> {
  const { call, hubspotUser, hubspotDealId, snapshot } = input;
  const links = input.config.links.filter((l) => l.enabled);
  const used = (object: AutofillObject) => links.some((l) => l.object === object);

  // D'abord seul : si le jeton doit être renouvelé, il l'est une fois, avant
  // les lectures en parallèle.
  const { scopes } = await getHubspotTokenInfo(hubspotUser);

  const needsStage = links.some((l) => l.object === "deal" && l.property === "dealstage");
  const [dealDefs, contactDefs, companyDefs, targets, pipelines, lastWritten, commercialName] = await Promise.all([
    used("deal") ? listHubSpotProperties(hubspotUser, "deal") : Promise.resolve([] as AutofillProperty[]),
    used("contact") ? listHubSpotProperties(hubspotUser, "contact") : Promise.resolve([] as AutofillProperty[]),
    used("company") ? listHubSpotProperties(hubspotUser, "company") : Promise.resolve([] as AutofillProperty[]),
    used("contact") || used("company")
      ? findDealTargets(hubspotUser, hubspotDealId, call.contact_email)
      : Promise.resolve({ contact: null, company: null } as DealTargets),
    needsStage ? listHubSpotPipelines(hubspotUser).catch(() => []) : Promise.resolve([]),
    getLastAutofillWrites(hubspotDealId),
    getUserName(call.user_id).catch(() => null),
  ]);
  const definitions: Record<AutofillObject, AutofillProperty[]> = { deal: dealDefs, contact: contactDefs, company: companyDefs };
  const ids: Record<AutofillObject, string | null> = { deal: hubspotDealId, contact: targets.contact?.id ?? null, company: targets.company?.id ?? null };

  const unavailable: Partial<Record<AutofillObject, string>> = {};
  if (used("contact")) {
    if (!ids.contact) unavailable.contact = "Contact introuvable dans HubSpot";
    else if (!scopes.includes(CONTACT_WRITE_SCOPE)) unavailable.contact = "Reconnectez HubSpot pour autoriser l'écriture des contacts";
  }
  if (used("company")) {
    if (!ids.company) unavailable.company = "Entreprise introuvable dans HubSpot";
    else if (!scopes.includes(COMPANY_WRITE_SCOPE)) unavailable.company = "Reconnectez HubSpot pour autoriser l'écriture des entreprises";
  }

  const current: Record<string, string | null> = {};
  await Promise.all(
    AUTOFILL_OBJECTS.map(async (object) => {
      const id = ids[object];
      const existing = new Set(definitions[object].map((p) => p.name));
      const names = links.filter((l) => l.object === object && existing.has(l.property)).map((l) => l.property);
      if (!id || names.length === 0) return;
      const values = await getHubSpotObjectValues(hubspotUser, object, id, names);
      for (const [name, value] of Object.entries(values)) current[linkId({ object, property: name })] = value;
    })
  );

  const pipeline = pipelines.find((p) => p.id === snapshot?.pipelineId) ?? null;
  const stage: StageContext | null = pipeline && snapshot?.stageId ? { stages: pipeline.stages, currentStageId: snapshot.stageId } : null;

  const lines = buildDealMemoryLines({
    transcript: call.transcript,
    turns: call.transcript_json?.turns ?? null,
    speakerNames: call.speaker_names_override,
  });
  // Inutile de demander au modèle ce qui ne pourra pas être écrit.
  const askable = links.filter((l) => !unavailable[l.object] && !(l.object === "deal" && l.property === "dealstage" && !stage));
  const extracted = await extractAutofillValues({
    links: askable,
    definitions,
    lines,
    callAt: call.started_at ?? call.created_at,
    commercialName,
    meetingTitle: call.meeting_title,
    contact: targets.contact ? { name: targets.contact.name, email: targets.contact.email } : null,
    companyName: targets.company?.name ?? snapshot?.name ?? call.company_name ?? null,
    stage,
  });

  const plans = planAutofill({ links, extracted, current, lastWritten, definitions, unavailable, dealClosed: snapshot?.closed ?? false, stage });
  const updates: Record<AutofillObject, Record<string, string>> = { deal: {}, contact: {}, company: {} };
  for (const p of plans) if (p.action === "write") updates[p.object][p.property] = p.value as string;
  return { plans, ids, updates };
}
