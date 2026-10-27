import {
  createDealFromHubspot,
  findDealByHubspotId,
  findDealByIdentity,
  findOrCreateDeal,
  getDealHistory,
  getOrganizationEmailDomains,
  getOrganizationForUser,
  getHubspotUserForOrganization,
  getUserName,
  saveCallDealMemory,
  setDealHubspot,
  type CallWithAnalysis,
} from "./db";
import { generateDealMemory } from "./deal-memory";
import { dealIdentityFor } from "./deal-grouping";
import type { HubspotDealSnapshot, StoredDealMemory } from "./deal-memory-schema";
import { findHubSpotDealForProspect, getHubSpotDealSnapshot } from "./crm/hubspot-deals";
import { reportWarning } from "./monitoring";

// Étape 3 : le deal HubSpot du prospect, lu avec la connexion HubSpot du
// commercial du call, sinon d'un autre membre de l'organisation. Un échec de
// HubSpot ne bloque pas la fiche : elle se rattache alors comme à l'étape 2.
async function findHubspotDeal(
  organizationId: string,
  call: CallWithAnalysis,
  identity: { domain: string | null; name: string | null } | null
): Promise<HubspotDealSnapshot | null> {
  try {
    const hubspotUser = await getHubspotUserForOrganization(organizationId, [call.user_id]);
    if (!hubspotUser) return null;
    const hubspotDealId = await findHubSpotDealForProspect(hubspotUser, {
      contactEmail: call.contact_email,
      domain: identity?.domain ?? null,
      companyName: identity?.name ?? null,
    });
    return hubspotDealId ? await getHubSpotDealSnapshot(hubspotUser, hubspotDealId) : null;
  } catch (err) {
    reportWarning("deal-memory.hubspot", err, { callId: call.id });
    return null;
  }
}

// Génère la fiche d'un call en tenant compte de son deal (étape 2) :
//  1. on cherche le deal d'après ce que le call sait déjà du prospect (email,
//     entreprise) ;
//  2. la fiche est générée avec ce que les calls précédents du deal ont
//     retenu, pour les alertes qui comparent ;
//  3. sans repère au départ, l'entreprise relevée par la fiche elle-même sert
//     à rattacher le call. Si elle désigne un deal qui avait déjà des calls
//     antérieurs, la fiche est régénérée une fois avec cet historique — sinon
//     ce call-là ne comparerait rien.
// Partagé par la route de génération et le script de backfill.
export async function runDealMemoryForCall(call: CallWithAnalysis, organizationId: string): Promise<StoredDealMemory> {
  const callAt = call.started_at ?? call.created_at;
  const [ownDomains, commercialName, ownOrganization] = await Promise.all([
    getOrganizationEmailDomains(organizationId),
    getUserName(call.user_id).catch(() => null),
    getOrganizationForUser(call.user_id).catch(() => null),
  ]);
  const ownCompanyName = ownOrganization?.name ?? null;

  const base = {
    transcript: call.transcript,
    turns: call.transcript_json?.turns ?? null,
    speakerNames: call.speaker_names_override,
    commercialName,
    meetingTitle: call.meeting_title,
    callAt,
  };

  const knownIdentity = dealIdentityFor({
    contactEmail: call.contact_email,
    prospectCompany: call.prospect_company,
    companyName: call.company_name,
    ownDomains,
    ownCompanyName,
  });
  // Le deal HubSpot prime : deux calls rattachés au même deal HubSpot sont le
  // même deal dans Brief, quels que soient l'email ou l'entreprise saisis.
  const hubspot = await findHubspotDeal(organizationId, call, knownIdentity);
  let dealId: string | null = null;
  if (hubspot) {
    dealId =
      (await findDealByHubspotId(organizationId, hubspot.id)) ??
      (knownIdentity ? await findOrCreateDeal(organizationId, knownIdentity) : await createDealFromHubspot(organizationId, hubspot));
    await setDealHubspot(dealId, hubspot);
  } else if (knownIdentity) {
    dealId = await findOrCreateDeal(organizationId, knownIdentity);
  }
  let history = dealId ? await getDealHistory(dealId, call.id, callAt) : [];

  let result = await generateDealMemory({ ...base, history });

  // Deal reconnu par le seul domaine : l'entreprise relevée par la fiche lui
  // donne son nom et un second repère.
  const extracted = dealIdentityFor({ contactEmail: null, prospectCompany: result.prospectCompany, companyName: null, ownDomains, ownCompanyName });
  if (dealId && knownIdentity && !knownIdentity.nameKey && extracted) {
    await findOrCreateDeal(organizationId, { domain: knownIdentity.domain, nameKey: extracted.nameKey, name: extracted.name });
  }

  if (!dealId) {
    const foundIdentity = extracted;
    if (foundIdentity) {
      const existing = await findDealByIdentity(organizationId, foundIdentity);
      dealId = await findOrCreateDeal(organizationId, foundIdentity);
      if (existing) {
        history = await getDealHistory(dealId, call.id, callAt);
        if (history.length > 0) result = await generateDealMemory({ ...base, history });
      }
    }
  }

  return saveCallDealMemory(call.id, organizationId, result, result.model, {
    dealId,
    callAt,
    prospectCompany: result.prospectCompany,
  });
}
