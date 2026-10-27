import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getCallActivityForUsers,
  getCommercialsForManager,
  getDealBoardRows,
  getDealReviews,
  getOrganizationPipelineStats,
  getProgressFichesForUser,
  getUserName,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildBoardNow, buildStages, buildTeam } from "@/lib/deal-board";
import { buildDealProgressNow, type DealProgress } from "@/lib/deal-progress";
import DealsBoardClient from "./DealsBoardClient";

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) {
    redirect("/brief");
  }

  // Les deals du manager : ceux de ses commerciaux liés, et les siens.
  const [commercials, ownName, reviews, pipelineStats, params] = await Promise.all([
    getCommercialsForManager(viewer.userId),
    getUserName(viewer.userId),
    getDealReviews(viewer.userId).catch(() => []),
    getOrganizationPipelineStats(viewer.organizationId),
    searchParams,
  ]);
  const people = [{ id: viewer.userId, name: ownName ?? "Vous" }, ...commercials.map((c) => ({ id: c.id, name: c.name ?? c.email ?? "Commercial" }))];
  const rows = await getDealBoardRows(viewer.organizationId, people.map((p) => p.id));

  const deals = buildBoardNow(rows, reviews, pipelineStats);
  const team = buildTeam(deals, people.map((p) => p.id));

  // Onglet Équipe (27/10/2026) : ce que fait chaque commercial — son activité
  // et ses deals tels qu'il les voit dans « Mes deals ».
  const organizationId = viewer.organizationId;
  const [activity, progressLists] = await Promise.all([
    getCallActivityForUsers(people.map((p) => p.id)).catch(() => ({}) as Record<string, { week: number; lastAt: string | null }>),
    Promise.all(people.map((p) => getProgressFichesForUser(organizationId, p.id).catch(() => []))),
  ]);
  const progress: Record<string, DealProgress[]> = Object.fromEntries(
    people.map((p, i) => [p.id, buildDealProgressNow(progressLists[i]).filter((d) => !d.hubspot?.closed)])
  );

  return (
    <DealsBoardClient
      deals={deals}
      stages={buildStages(deals.filter((d) => !d.hiddenBecause), pipelineStats)}
      team={team}
      activity={activity}
      progress={progress}
      people={Object.fromEntries(people.map((p) => [p.id, p.name]))}
      initialTab={params.tab === "equipe" ? "equipe" : "file"}
      initialStage={params.stage ?? null}
    />
  );
}
