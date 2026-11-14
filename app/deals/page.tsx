import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getCommercialsForManager,
  getOrganizationDealRules,
  getProgressFichesForUser,
  getUserAvatars,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import { suiviDeal } from "@/lib/deal-suivi";
import { managerTitle } from "@/lib/deal-coaching";
import { forecastDeal, forecastPeriods, isWon, type ForecastDeal, type ForecastPerson } from "@/lib/deal-forecast";
import DealsBoardClient from "./DealsBoardClient";
import type { TeamPerson } from "./team";

// Suivi des deals (manager) : la vue par priorité (14/11/2026) et la
// prévision (10/11/2026). Ne lit que ce que ces deux
// onglets affichent (fluidité, 03/11/2026 : la file « Où intervenir », son
// effet mesuré et ses revues ne sont plus affichés, ils ne sont plus lus).
export default async function DealsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/brief");
  const organizationId = viewer.organizationId;

  // Les deals de ses commerciaux liés seulement — les siens sont dans « Deals ».
  // Le contrôle d'accès part avec les lectures, rien n'est affiché avant lui.
  const [enabled, commercials, rules, params] = await Promise.all([
    isDealMemoryEnabledForOrganization(organizationId),
    getCommercialsForManager(viewer.userId),
    getOrganizationDealRules(organizationId),
    searchParams,
  ]);
  if (!enabled) redirect("/brief");
  const people = commercials.map((c) => ({ id: c.id, name: c.name ?? c.email ?? "Commercial" }));
  const ids = people.map((p) => p.id);
  const [progressLists, avatars] = await Promise.all([
    Promise.all(people.map((p) => getProgressFichesForUser(organizationId, p.id).catch(() => []))),
    getUserAvatars(ids),
  ]);

  const allProgress = people.map((_, i) => buildDealProgressNow(progressLists[i], rules));
  const progress = allProgress.map((list) => list.filter((d) => !d.hubspot?.closed));
  // Prévision de chiffre d'affaires (10/11/2026) : le jour à Paris.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const forecastPeople: ForecastPerson[] = people.map((p, i) => {
    const deals = progress[i].map((d) => forecastDeal(d, today, managerTitle(d, p.name))).filter((d): d is ForecastDeal => d !== null);
    return {
      id: p.id,
      name: p.name,
      avatarUrl: avatars[p.id] ?? null,
      deals,
      signed: allProgress[i]
        .filter((d) => isWon(d) && d.hubspot?.amount && d.hubspot.closeDate)
        .map((d) => ({ amount: d.hubspot!.amount!, closeDate: d.hubspot!.closeDate!.slice(0, 10) })),
      uncounted: progress[i].length - deals.length,
    };
  });
  const teamPeople: TeamPerson[] = people.map((p) => ({ id: p.id, name: p.name, avatarUrl: avatars[p.id] ?? null }));
  const suiviDeals = people.flatMap((p, i) => progress[i].map((d) => suiviDeal(d, p.name)));

  return (
    <DealsBoardClient
      teamPeople={teamPeople}
      suiviDeals={suiviDeals}
      hasTeam={people.length > 0}
      forecast={{ people: forecastPeople, periods: forecastPeriods(today), today }}
      // Les anciens liens (?tab=regles, ?tab=hubspot, ?tab=file…) mènent à
      // la vue « Par commercial ».
      initialTab={params.tab === "prevision" ? "prevision" : "suivi"}
    />
  );
}
