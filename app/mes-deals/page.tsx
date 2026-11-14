import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getDealClosures, getOrganizationDealRules, getProgressFichesForUser, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildDealProgress, dealsSummary } from "@/lib/deal-progress";
import { MEETING } from "@/lib/deal-chronology";
import { nowMs } from "@/lib/format";
import DealsByState from "./DealsByState";

// « Deals » (ex-« Mes deals ») : quatre chiffres puis les deals regroupés par
// état (maquette B du 14/11/2026). Un clic ouvre la page du deal (/deal/<id>),
// qui porte la priorité, les engagements et l'état du deal.
export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId) redirect("/brief");

  // Le contrôle d'accès part avec les lectures (03/11/2026, fluidité) ; rien
  // n'est affiché avant lui.
  const [enabled, fiches, rules, closures] = await Promise.all([
    isDealMemoryEnabledForOrganization(viewer.organizationId),
    getProgressFichesForUser(viewer.organizationId, viewer.userId),
    getOrganizationDealRules(viewer.organizationId),
    getDealClosures(viewer.organizationId),
  ]);
  if (!enabled) redirect("/brief");
  // Un deal clos, dans HubSpot ou depuis Brief, n'a plus de suite à préparer.
  const now = nowMs();
  const deals = buildDealProgress(fiches, now, rules).filter((d) => !d.hubspot?.closed && !closures.has(d.id));
  return (
    <>
      <DealsByState deals={deals} summary={dealsSummary(deals, now, (text) => MEETING.test(text))} />
      {/* Un call s'ouvre depuis son deal ; ceux rattachés à aucun deal
          (entretien, point interne, call mal rattaché) se retrouvent ici
          (réponse de Jean à E6, 05/11/2026). */}
      <p className="mt-5 text-[13px] text-stone-500">
        <Link href="/feedback" className="font-semibold text-[color:var(--violet)] hover:underline">
          Tous mes calls
        </Link>
        , y compris ceux sans deal.
      </p>
    </>
  );
}
