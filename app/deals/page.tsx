import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getCommercialsForManager, getDealBoardRows, getDealReviews, getUserName, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { buildBoardNow, buildStages, buildTeam } from "@/lib/deal-board";
import DealsBoardClient from "./DealsBoardClient";

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) {
    redirect("/dashboard");
  }

  // Les deals du manager : ceux de ses commerciaux liés, et les siens.
  const [commercials, ownName, reviews, params] = await Promise.all([
    getCommercialsForManager(viewer.userId),
    getUserName(viewer.userId),
    getDealReviews(viewer.userId).catch(() => []),
    searchParams,
  ]);
  const people = [{ id: viewer.userId, name: ownName ?? "Vous" }, ...commercials.map((c) => ({ id: c.id, name: c.name ?? c.email ?? "Commercial" }))];
  const rows = await getDealBoardRows(viewer.organizationId, people.map((p) => p.id));

  const deals = buildBoardNow(rows, reviews);
  const team = buildTeam(deals, people.map((p) => p.id)).filter((t) => t.deals > 0);

  return (
    <DealsBoardClient
      deals={deals}
      stages={buildStages(deals.filter((d) => !d.hiddenBecause))}
      team={team}
      people={Object.fromEntries(people.map((p) => [p.id, p.name]))}
      initialTab={params.tab === "equipe" ? "equipe" : "file"}
      initialStage={params.stage ?? null}
    />
  );
}
