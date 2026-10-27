import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { isUuid } from "@/lib/uuid";
import {
  getCommercialsForManager,
  getDealMemoryObjections,
  getDealPageFiches,
  getUserName,
  isDealMemoryEnabledForOrganization,
  loadDealMemoryPanel,
} from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import { buildDealReview } from "@/lib/deal-review";
import DealPageView from "./DealPageView";

// Page d'un deal (demande de Jean du 27/10/2026) : où en est le deal, de
// façon claire. Le commercial la voit pour ses deals ; le manager pour ceux
// de ses commerciaux liés et les siens, avec en plus le bilan : bien fait,
// mal fait, faut-il intervenir.
export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  if (!isUuid(dealId)) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) redirect("/brief");

  const fiches = await getDealPageFiches(dealId, viewer.organizationId);
  if (!fiches || fiches.length === 0) notFound();

  const isManager = viewer.role === "manager";
  const allowed = new Set([viewer.userId, ...(isManager ? (await getCommercialsForManager(viewer.userId)).map((c) => c.id) : [])]);
  if (!fiches.some((f) => allowed.has(f.ownerId))) notFound();

  const [progress] = buildDealProgressNow(fiches);
  const latest = progress.lastCall.id;
  const ownerIds = [...new Set(fiches.map((f) => f.ownerId))];
  const [panel, objectionLists, ownerNames] = await Promise.all([
    loadDealMemoryPanel(viewer.role, viewer.organizationId, latest),
    Promise.all(fiches.map((f) => getDealMemoryObjections(f.callId).catch(() => []))),
    Promise.all(ownerIds.map((id) => getUserName(id).catch(() => null))),
  ]);
  const objectionsByCall = Object.fromEntries(fiches.map((f, i) => [f.callId, objectionLists[i]]));
  const owners = Object.fromEntries(ownerIds.map((id, i) => [id, ownerNames[i] ?? "Commercial"]));

  return (
    <DealPageView
      progress={progress}
      fiches={fiches}
      owners={owners}
      panel={panel}
      review={isManager ? buildDealReview(fiches, objectionsByCall, progress) : null}
      backHref={isManager ? "/deals" : "/mes-deals"}
      backLabel={isManager ? "Deals de l'équipe" : "Mes deals"}
    />
  );
}
