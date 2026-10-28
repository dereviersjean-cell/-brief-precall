import { buildDealChronology } from "@/lib/deal-chronology";
import { nowMs } from "@/lib/format";
import { adviceFor } from "@/lib/deal-advice";
import { coachingQuestions, firstName, managerTitle, managerWhy } from "@/lib/deal-coaching";
import DealChronologyView, { type ChronoAdvice } from "./DealChronologyView";
import { loadDealPage } from "./load";

// Page d'un deal : sa chronologie (demande de Jean du 28/10/2026), entre la
// vue d'ensemble des deals et le détail (/deal/<id>/detail). Le commercial la
// voit pour ses deals ; le manager pour ceux de ses commerciaux liés et les
// siens.
export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const deal = await loadDealPage(dealId);
  const now = nowMs();
  // Le commercial du deal lit son conseil ; un manager, ce qu'il en dit au
  // commercial.
  const ownerId = deal.fiches[deal.fiches.length - 1].ownerId;
  let advice: ChronoAdvice;
  if (ownerId === deal.viewer.userId) {
    const a = adviceFor(deal.progress);
    advice = { title: a.title, why: a.why, label: `${a.howLabel} · ${a.when}`, lines: a.how };
  } else {
    const owner = deal.owners[ownerId] ?? "le commercial";
    advice = {
      title: managerTitle(deal.progress, owner),
      why: managerWhy(deal.progress),
      label: `Ce que vous pouvez dire à ${firstName(owner)}`,
      lines: coachingQuestions(deal.progress),
    };
  }
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
      advice={advice}
    />
  );
}
