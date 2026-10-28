import { loadDealMemoryPanel } from "@/lib/db";
import { buildDealReview } from "@/lib/deal-review";
import DealPageView from "../DealPageView";
import { loadDealPage } from "../load";

// Le détail d'un deal (27/10/2026, déplacé ici le 28/10 quand la chronologie
// a pris l'adresse du deal) : le fil des calls un par un, le bilan du
// manager, le conseil pour le prochain call et la qualification.
export default async function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const deal = await loadDealPage(dealId);
  const panel = await loadDealMemoryPanel(deal.viewer.role, deal.viewer.organizationId, deal.progress.lastCall.id);
  return (
    <DealPageView
      timeline={deal.timeline}
      progress={deal.progress}
      owners={deal.owners}
      panel={panel}
      review={deal.isManager ? buildDealReview(deal.fiches, deal.objectionsByCall, deal.progress, deal.rules) : null}
      backHref={`/deal/${dealId}`}
      backLabel="Chronologie du deal"
    />
  );
}
