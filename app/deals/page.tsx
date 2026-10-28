import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getAlertImpactData,
  getCallActivityForUsers,
  getCommercialAdvice,
  getCommercialsForManager,
  getDealBoardRows,
  getDealReviews,
  getOrganizationDealRules,
  getOrganizationPipelineStats,
  getProgressFichesForUser,
  getUserAvatars,
  getUserName,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildBoardNow, buildStages } from "@/lib/deal-board";
import { interventionLevel } from "@/lib/deal-coaching";
import { buildDealProgressNow } from "@/lib/deal-progress";
import { buildAlertImpact } from "@/lib/deal-impact";
import { nowMs } from "@/lib/format";
import DealsBoardClient from "./DealsBoardClient";
import type { TeamPerson } from "./TeamCoachView";

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string; stage?: string; commercial?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) {
    redirect("/brief");
  }

  // Les deals du manager : ceux de ses commerciaux liés, et les siens.
  const [commercials, ownName, reviews, pipelineStats, rules, params] = await Promise.all([
    getCommercialsForManager(viewer.userId),
    getUserName(viewer.userId),
    getDealReviews(viewer.userId).catch(() => []),
    getOrganizationPipelineStats(viewer.organizationId),
    getOrganizationDealRules(viewer.organizationId),
    searchParams,
  ]);
  const people = [{ id: viewer.userId, name: ownName ?? "Vous" }, ...commercials.map((c) => ({ id: c.id, name: c.name ?? c.email ?? "Commercial" }))];
  const rows = await getDealBoardRows(viewer.organizationId, people.map((p) => p.id));

  const deals = buildBoardNow(rows, reviews, pipelineStats, rules);

  // Onglet Équipe (27/10/2026) : ce que fait chaque commercial — son activité
  // et ses deals tels qu'il les voit dans « Mes deals ».
  const organizationId = viewer.organizationId;
  const [activity, progressLists, avatars, personAdvice] = await Promise.all([
    getCallActivityForUsers(people.map((p) => p.id)).catch(() => ({}) as Record<string, { week: number; lastAt: string | null }>),
    Promise.all(people.map((p) => getProgressFichesForUser(organizationId, p.id).catch(() => []))),
    getUserAvatars(people.map((p) => p.id)),
    getCommercialAdvice(people.map((p) => p.id)),
  ]);
  // L'effet des alertes sur 90 jours (lib/deal-impact.ts) : un deal « vu »
  // a-t-il eu un nouveau call dans le délai d'inactivité de l'organisation ?
  const now = nowMs();
  const impactData = await getAlertImpactData(organizationId, new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()).catch(() => null);
  const impact = impactData ? buildAlertImpact(impactData.events, impactData.callsByDeal, now, rules.inactivityDays) : null;

  // Une carte par personne qui a des deals ou de l'activité récente ; celles
  // dont un deal demande d'intervenir passent devant (version M3, 27/10/2026).
  const weight = (p: TeamPerson) =>
    p.deals.filter((d) => interventionLevel(d) === "oui").length * 100 + p.deals.filter((d) => interventionLevel(d) === "surveiller").length;
  const teamPeople: TeamPerson[] = people
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      avatarUrl: avatars[p.id] ?? null,
      week: activity[p.id]?.week ?? 0,
      lastAt: activity[p.id]?.lastAt ?? null,
      deals: buildDealProgressNow(progressLists[i], rules).filter((d) => !d.hubspot?.closed),
      aiAdvice: personAdvice[p.id] ?? null,
    }))
    .filter((p) => p.deals.length > 0 || p.lastAt !== null)
    .sort((a, b) => weight(b) - weight(a));

  return (
    <DealsBoardClient
      deals={deals}
      stages={buildStages(deals.filter((d) => !d.hiddenBecause), pipelineStats)}
      teamPeople={teamPeople}
      impact={impact}
      impactWindowDays={rules.inactivityDays}
      people={Object.fromEntries(people.map((p) => [p.id, p.name]))}
      initialTab={
        params.tab === "file" ? "file" : params.tab === "regles" ? "regles" : params.tab === "hubspot" ? "hubspot" : params.tab === "equipe" || params.commercial ? "equipe" : "ensemble"
      }
      initialStage={params.stage ?? null}
      initialCommercial={params.commercial ?? null}
    />
  );
}
