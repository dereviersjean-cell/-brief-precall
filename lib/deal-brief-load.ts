import {
  findDealByHubspotId,
  findDealByIdentity,
  findDealByNamePrefix,
  getHubspotUserForOrganization,
  teachDealDomain,
  getDealMemoryObjections,
  getDealPageFiches,
  getOrganizationEmailDomains,
  getOrganizationDealRules,
  getOrganizationForUser,
  isDealMemoryEnabledForOrganization,
} from "./db";
import { dealIdentityFor } from "./deal-grouping";
import { buildDealBriefContext, type DealBriefContext } from "./deal-brief";
import { qualificationFields } from "./deal-rules";
import { findHubSpotDealForProspect, getHubSpotDealDomains } from "./crm/hubspot-deals";
import { reportWarning } from "./monitoring";

// Le deal d'un rendez-vous à venir, d'après l'email du contact ou le nom de
// l'entreprise — les mêmes repères que le rattachement d'un call (étape 2).
// null pour un premier call, ou hors des organisations en test.
export async function loadDealBriefContext(
  userId: string,
  contactEmail: string | null,
  companyName: string | null
): Promise<DealBriefContext | null> {
  const org = await getOrganizationForUser(userId).catch(() => null);
  if (!org || !(await isDealMemoryEnabledForOrganization(org.id))) return null;
  const ownDomains = await getOrganizationEmailDomains(org.id);
  const identity = dealIdentityFor({
    contactEmail,
    prospectCompany: null,
    companyName,
    ownDomains,
    ownCompanyName: org.name ?? null,
  });
  const found = identity ? await findDealByIdentity(org.id, identity) : null;
  const near = !found && identity?.nameKey ? await findDealByNamePrefix(org.id, identity.nameKey).catch(() => null) : null;
  const dealId = found?.id ?? near ?? (await findViaHubspot(org.id, userId, contactEmail, identity?.domain ?? null, identity?.name ?? companyName, ownDomains));
  if (!dealId) return null;
  const fiches = await getDealPageFiches(dealId, org.id);
  if (!fiches || fiches.length === 0) return null;
  const latest = [...fiches].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? "")).at(-1)!;
  const objections = await getDealMemoryObjections(latest.callId).catch(() => []);
  const rules = await getOrganizationDealRules(org.id);
  return buildDealBriefContext(fiches, objections, qualificationFields(rules), rules);
}

// Filet de sécurité (28/10/2026) : un deal relié à HubSpot que ni le domaine
// ni le nom ne retrouvent (ses calls n'avaient pas d'email de contact). On
// demande à HubSpot le deal du contact du rendez-vous ; s'il est connu de
// Brief, il apprend au passage ses domaines, pour la prochaine fois.
async function findViaHubspot(
  organizationId: string,
  userId: string,
  contactEmail: string | null,
  domain: string | null,
  companyName: string | null,
  ownDomains: string[]
): Promise<string | null> {
  if (!contactEmail && !domain && !companyName) return null;
  try {
    const hubspotUser = await getHubspotUserForOrganization(organizationId, [userId]);
    if (!hubspotUser) return null;
    const hubspotDealId = await findHubSpotDealForProspect(hubspotUser, { contactEmail, domain, companyName });
    const dealId = hubspotDealId ? await findDealByHubspotId(organizationId, hubspotDealId) : null;
    if (dealId && hubspotDealId) await teachDealDomain(organizationId, dealId, await getHubSpotDealDomains(hubspotUser, hubspotDealId), ownDomains);
    return dealId;
  } catch (err) {
    reportWarning("deal-brief.hubspot-fallback", err, { userId });
    return null;
  }
}
