import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import {
  getCallActivityForUsers,
  getOrganizationDealRules,
  getProgressFichesForUser,
  getUserAvatars,
  getUserName,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
import DealsOverview from "@/app/deals/DealsOverview";

// « Mes deals » (28/10/2026, demande de Jean : le même parcours que le
// manager) : la vue d'ensemble de ses deals en cours ; un clic ouvre la
// chronologie du deal (/deal/<id>), puis son détail (/deal/<id>/detail). Le
// conseil de Brief est dans la chronologie, bloc « Aujourd'hui ». L'ancienne
// vue liste + conseil (MesDealsView, version D3) reste dans le code.
export default async function MesDealsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) redirect("/brief");

  const [fiches, rules, name, avatars, activity] = await Promise.all([
    getProgressFichesForUser(viewer.organizationId, viewer.userId),
    getOrganizationDealRules(viewer.organizationId),
    getUserName(viewer.userId).catch(() => null),
    getUserAvatars([viewer.userId]).catch(() => ({}) as Record<string, string | null>),
    getCallActivityForUsers([viewer.userId]).catch(() => ({}) as Record<string, { week: number; lastAt: string | null }>),
  ]);
  const all = buildDealProgressNow(fiches, rules);
  // Un deal clos dans HubSpot n'a plus de suite à préparer.
  const deals = all.filter((d) => !d.hubspot?.closed);
  const me = {
    id: viewer.userId,
    name: name ?? "Moi",
    avatarUrl: avatars[viewer.userId] ?? null,
    week: activity[viewer.userId]?.week ?? 0,
    lastAt: activity[viewer.userId]?.lastAt ?? null,
    deals,
  };
  return <DealsOverview people={[me]} self closed={all.length - deals.length} />;
}
