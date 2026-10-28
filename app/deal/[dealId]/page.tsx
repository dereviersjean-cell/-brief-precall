import { buildDealChronology } from "@/lib/deal-chronology";
import { nowMs } from "@/lib/format";
import DealChronologyView from "./DealChronologyView";
import { loadDealPage } from "./load";

// Page d'un deal : sa chronologie (demande de Jean du 28/10/2026), entre la
// vue d'ensemble des deals et le détail (/deal/<id>/detail). Le commercial la
// voit pour ses deals ; le manager pour ceux de ses commerciaux liés et les
// siens.
export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const deal = await loadDealPage(dealId);
  const now = nowMs();
  return (
    <DealChronologyView
      dealId={dealId}
      progress={deal.progress}
      chrono={buildDealChronology(deal.timeline, now)}
      owners={deal.owners}
      now={now}
      inactivityDays={deal.rules.inactivityDays}
      backHref={deal.backHref}
      backLabel={deal.backLabel}
    />
  );
}
