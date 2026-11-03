import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getOrganizationDealRules, getProgressFichesForUser, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import DealsList from "@/app/components/DealsList";

// « Deals » (ex-« Mes deals », menu du 03/11/2026) : une ligne par deal en
// cours — nom, étape, dernier échange, santé. Un clic ouvre la vue Deal
// (/deal/<id>), qui porte la priorité, les engagements et l'état du deal.
export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId) redirect("/brief");

  // Le contrôle d'accès part avec les lectures (03/11/2026, fluidité) ; rien
  // n'est affiché avant lui.
  const [enabled, fiches, rules] = await Promise.all([
    isDealMemoryEnabledForOrganization(viewer.organizationId),
    getProgressFichesForUser(viewer.organizationId, viewer.userId),
    getOrganizationDealRules(viewer.organizationId),
  ]);
  if (!enabled) redirect("/brief");
  // Un deal clos dans HubSpot n'a plus de suite à préparer.
  const deals = buildDealProgressNow(fiches, rules).filter((d) => !d.hubspot?.closed);
  return (
    <DealsList rows={deals.map((deal) => ({ deal }))} emptyText="Aucun deal en cours : chaque call enregistré crée ou complète le deal de son prospect." />
  );
}
