import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getOrganizationDealRules, getProgressFichesForUser, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import MesDealsList from "./MesDealsList";

// « Mes deals » (02/11/2026, demande de Jean) : une ligne par deal en cours —
// nom, étape, dernier échange, santé — et rien d'autre pour l'instant. Un
// clic ouvre la chronologie du deal (/deal/<id>), puis son détail
// (/deal/<id>/detail) ; le conseil de Brief est dans la chronologie.
// L'ancienne vue liste + conseil (MesDealsView, version D3) reste dans le code.
export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) redirect("/brief");

  const [fiches, rules] = await Promise.all([
    getProgressFichesForUser(viewer.organizationId, viewer.userId),
    getOrganizationDealRules(viewer.organizationId),
  ]);
  // Un deal clos dans HubSpot n'a plus de suite à préparer.
  const deals = buildDealProgressNow(fiches, rules).filter((d) => !d.hubspot?.closed);
  return <MesDealsList deals={deals} />;
}
