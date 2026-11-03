import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getCommercialAdvice,
  getCommercialsForManager,
  getOrganizationDealRules,
  getOrganizationPipelineStats,
  getProgressFichesForUser,
  getUserAvatars,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildStages } from "@/lib/deal-board";
import { buildDealProgressNow } from "@/lib/deal-progress";
import { suiviDeal } from "@/lib/deal-suivi";
import DealsBoardClient from "./DealsBoardClient";
import type { TeamPerson } from "./team";

// Suivi des deals (manager) : la vue « Par commercial » (03/11/2026), les
// règles des deals, la connexion HubSpot. Ne lit que ce que ces trois
// onglets affichent (fluidité, 03/11/2026 : la file « Où intervenir », son
// effet mesuré et ses revues ne sont plus affichés, ils ne sont plus lus).
export default async function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/brief");
  const organizationId = viewer.organizationId;

  // Les deals de ses commerciaux liés seulement — les siens sont dans « Deals ».
  // Le contrôle d'accès part avec les lectures, rien n'est affiché avant lui.
  const [enabled, commercials, pipelineStats, rules, params] = await Promise.all([
    isDealMemoryEnabledForOrganization(organizationId),
    getCommercialsForManager(viewer.userId),
    getOrganizationPipelineStats(organizationId),
    getOrganizationDealRules(organizationId),
    searchParams,
  ]);
  if (!enabled) redirect("/brief");
  const people = commercials.map((c) => ({ id: c.id, name: c.name ?? c.email ?? "Commercial" }));
  const ids = people.map((p) => p.id);
  const [progressLists, avatars, personAdvice] = await Promise.all([
    Promise.all(people.map((p) => getProgressFichesForUser(organizationId, p.id).catch(() => []))),
    getUserAvatars(ids),
    getCommercialAdvice(ids),
  ]);

  const progress = people.map((_, i) => buildDealProgressNow(progressLists[i], rules).filter((d) => !d.hubspot?.closed));
  const teamPeople: TeamPerson[] = people.map((p, i) => {
    const advice = personAdvice[p.id];
    return {
      id: p.id,
      name: p.name,
      avatarUrl: avatars[p.id] ?? null,
      deals: progress[i].map((d) => suiviDeal(d, p.name)),
      advice: advice ? { title: advice.title, why: advice.why } : null,
    };
  });
  // Les libellés des étapes HubSpot, pour l'onglet Règles.
  const stageLabels = Object.fromEntries(
    buildStages(progress.flat(), pipelineStats)
      .filter((s) => s.index)
      .map((s) => [s.index as number, s.label])
  );

  return (
    <DealsBoardClient
      teamPeople={teamPeople}
      hasTeam={people.length > 0}
      stageLabels={stageLabels}
      // Les anciens liens (?tab=ensemble, ?tab=equipe, ?tab=file) mènent à la
      // vue « Par commercial ».
      initialTab={params.tab === "regles" ? "regles" : params.tab === "hubspot" ? "hubspot" : "suivi"}
    />
  );
}
