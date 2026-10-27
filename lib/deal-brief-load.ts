import {
  findDealByIdentity,
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
  const identity = dealIdentityFor({
    contactEmail,
    prospectCompany: null,
    companyName,
    ownDomains: await getOrganizationEmailDomains(org.id),
    ownCompanyName: org.name ?? null,
  });
  if (!identity) return null;
  const deal = await findDealByIdentity(org.id, identity);
  if (!deal) return null;
  const fiches = await getDealPageFiches(deal.id, org.id);
  if (!fiches || fiches.length === 0) return null;
  const latest = [...fiches].sort((a, b) => (a.callAt ?? "").localeCompare(b.callAt ?? "")).at(-1)!;
  const objections = await getDealMemoryObjections(latest.callId).catch(() => []);
  const rules = await getOrganizationDealRules(org.id);
  return buildDealBriefContext(fiches, objections, qualificationFields(rules));
}
