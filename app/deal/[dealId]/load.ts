import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { isUuid } from "@/lib/uuid";
import {
  getCommercialsForManager,
  getDealCallDetails,
  getDealMemoryObjections,
  getDealPageFiches,
  getOrganizationDealRules,
  getUserName,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import { buildDealTimeline } from "@/lib/deal-timeline";

// Ce que lisent les deux pages d'un deal — la chronologie et le détail —,
// contrôle d'accès compris : le commercial voit ses deals, le manager ceux de
// ses commerciaux liés et les siens.
export async function loadDealPage(rawDealId: string) {
  if (!isUuid(rawDealId)) notFound();
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const organizationId = viewer.organizationId;
  if (!organizationId || !(await isDealMemoryEnabledForOrganization(organizationId))) redirect("/brief");

  const fiches = await getDealPageFiches(rawDealId, organizationId);
  if (!fiches || fiches.length === 0) notFound();

  const isManager = viewer.role === "manager";
  const allowed = new Set([viewer.userId, ...(isManager ? (await getCommercialsForManager(viewer.userId)).map((c) => c.id) : [])]);
  if (!fiches.some((f) => allowed.has(f.ownerId))) notFound();

  const ownerIds = [...new Set(fiches.map((f) => f.ownerId))];
  const [rules, objectionLists, ownerNames, callDetails] = await Promise.all([
    getOrganizationDealRules(organizationId),
    Promise.all(fiches.map((f) => getDealMemoryObjections(f.callId).catch(() => []))),
    Promise.all(ownerIds.map((id) => getUserName(id).catch(() => null))),
    getDealCallDetails(fiches.map((f) => f.callId)).catch(() => ({})),
  ]);
  const [progress] = buildDealProgressNow(fiches, rules);
  const objectionsByCall = Object.fromEntries(fiches.map((f, i) => [f.callId, objectionLists[i]]));
  const owners = Object.fromEntries(ownerIds.map((id, i) => [id, ownerNames[i] ?? "Commercial"]));
  // Le fil des calls (28/10/2026) : dans l'ordre où ils ont eu lieu.
  const timeline = buildDealTimeline(fiches, rules, callDetails, objectionsByCall);

  return {
    viewer: { ...viewer, organizationId },
    isManager,
    dealId: rawDealId,
    fiches,
    rules,
    progress,
    owners,
    objectionsByCall,
    timeline,
    backHref: isManager ? "/deals" : "/mes-deals",
    backLabel: isManager ? "Deals de l'équipe" : "Mes deals",
  };
}
