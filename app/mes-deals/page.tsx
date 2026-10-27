import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getProgressFichesForUser, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import MesDealsView from "./MesDealsView";

export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) redirect("/dashboard");

  const all = buildDealProgressNow(await getProgressFichesForUser(viewer.organizationId, viewer.userId));
  // Un deal clos dans HubSpot n'a plus de suite à préparer.
  const deals = all.filter((d) => !d.hubspot?.closed);
  return <MesDealsView deals={deals} closed={all.length - deals.length} />;
}
