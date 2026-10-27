import {
  findDealByIdentity,
  getOrganizationEmailDomains,
  getOrganizationForUser,
  isDealMemoryEnabledForOrganization,
} from "./db";
import { supabaseAdmin } from "./supabase";
import { dealIdentityFor } from "./deal-grouping";
import type { MeetingStage } from "./meeting-stage";

// L'étape R1/R2/R3 d'un call d'après son vrai rang dans le deal du prospect
// (27/10/2026), plutôt que d'après le titre du rendez-vous : le titre dépend
// de qui a créé l'invitation, le rang se compte. Les consignes d'analyse par
// étape (lib/meeting-stage.ts) s'appliquent alors au bon call ; R3 couvre
// les calls suivants. Organisations où la fiche deal est ouverte seulement —
// ailleurs il n'y a pas de deals, et tout call passerait pour un R1.
// null = on ne sait pas : l'appelant retombe sur le titre.
export async function stageFromDealRank(
  userId: string,
  prospect: { contactEmail: string | null; companyName: string | null },
  callAt: string
): Promise<MeetingStage | null> {
  const org = await getOrganizationForUser(userId).catch(() => null);
  if (!org || !(await isDealMemoryEnabledForOrganization(org.id))) return null;
  const identity = dealIdentityFor({
    contactEmail: prospect.contactEmail,
    prospectCompany: null,
    companyName: prospect.companyName,
    ownDomains: await getOrganizationEmailDomains(org.id),
    ownCompanyName: org.name ?? null,
  });
  if (!identity) return null;
  const deal = await findDealByIdentity(org.id, identity);
  if (!deal) return "r1";
  const { count, error } = await supabaseAdmin
    .from("call_deal_memory")
    .select("call_id", { count: "exact", head: true })
    .eq("deal_id", deal.id)
    .lt("call_at", callAt);
  if (error) throw error;
  const rank = (count ?? 0) + 1;
  return rank === 1 ? "r1" : rank === 2 ? "r2" : "r3";
}
