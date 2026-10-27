import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getOrganizationDealRules, getProgressFichesForUser, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import MesDealsView from "./MesDealsView";

export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) redirect("/brief");

  const [fiches, rules] = await Promise.all([
    getProgressFichesForUser(viewer.organizationId, viewer.userId),
    getOrganizationDealRules(viewer.organizationId),
  ]);
  const all = buildDealProgressNow(fiches, rules);
  // Un deal clos dans HubSpot n'a plus de suite à préparer.
  const deals = all.filter((d) => !d.hubspot?.closed);
  return <MesDealsView deals={deals} closed={all.length - deals.length} />;
}
