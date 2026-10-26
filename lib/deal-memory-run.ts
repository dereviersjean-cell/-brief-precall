import {
  findDealByIdentity,
  findOrCreateDeal,
  getDealHistory,
  getOrganizationEmailDomains,
  getUserName,
  saveCallDealMemory,
  type CallWithAnalysis,
} from "./db";
import { generateDealMemory } from "./deal-memory";
import { dealIdentityFor } from "./deal-grouping";
import type { StoredDealMemory } from "./deal-memory-schema";

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
  const [ownDomains, commercialName] = await Promise.all([
    getOrganizationEmailDomains(organizationId),
    getUserName(call.user_id).catch(() => null),
  ]);

  const base = {
    transcript: call.transcript,
    turns: call.transcript_json?.turns ?? null,
    speakerNames: call.speaker_names_override,
    commercialName,
    meetingTitle: call.meeting_title,
  };

  const knownIdentity = dealIdentityFor({
    contactEmail: call.contact_email,
    prospectCompany: call.prospect_company,
    companyName: call.company_name,
    ownDomains,
  });
  let dealId = knownIdentity ? await findOrCreateDeal(organizationId, knownIdentity) : null;
  let history = dealId ? await getDealHistory(dealId, call.id, callAt) : [];

  let result = await generateDealMemory({ ...base, history });

  if (!dealId) {
    const foundIdentity = dealIdentityFor({ contactEmail: null, prospectCompany: result.prospectCompany, companyName: null, ownDomains });
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
