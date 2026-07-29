import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserRole,
  getUserOrganizationId,
  getCommercialsForManager,
  getUsersInOrganization,
  getTeamAnalytics,
} from "@/lib/db";
import { resolvePeriod } from "@/lib/period";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import FadeIn from "../FadeIn";
import PeriodFilter from "../PeriodFilter";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

// Onglet Performance > Analytics. Périmètre des données :
//  · manager → ses commerciaux liés (getCommercialsForManager, même règle
//    d'autorisation que getTeamAverageScores) ;
//  · commercial → les commerciaux de son organisation pour CALCULER la
//    moyenne d'équipe, mais seule sa propre barre est affichée (showTeamRoster
//    à false) : il se situe par rapport à l'équipe sans voir le classement
//    nominatif de ses collègues.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, organizationId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  const isManager = role === "manager";
  const period = resolvePeriod(await searchParams);

  if (!organizationId) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <PageHeader eyebrow="Performance" title="Analytics" />
        <Card className="mt-8">
          <p className="text-sm italic text-slate-400">
            Vous devez être rattaché à une organisation pour voir les statistiques d&apos;équipe.
          </p>
        </Card>
      </div>
    );
  }

  const userIds = isManager
    ? (await getCommercialsForManager(userId)).map((c) => c.id)
    : (await getUsersInOrganization(organizationId)).filter((m) => m.role === "commercial").map((m) => m.id);

  // Le commercial doit figurer dans le périmètre pour que sa propre barre
  // existe — vrai par construction côté commercial, pas côté manager qui
  // prend lui-même rarement des rendez-vous.
  const scopedUserIds = userIds.includes(userId) || isManager ? userIds : [...userIds, userId];

  const analytics = await getTeamAnalytics(organizationId, scopedUserIds, period);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Performance"
            title="Analytics"
            subtitle={
              isManager
                ? `Comment votre équipe conduit ses rendez-vous — ${period.label}.`
                : `Vos chiffres de conduite de rendez-vous, comparés à la moyenne de l'équipe — ${period.label}.`
            }
          />
        </div>
      </FadeIn>

      <PeriodFilter preset={period.preset} from={period.from} to={period.to} />

      <FadeIn delay={0.05}>
        <AnalyticsClient analytics={analytics} currentUserId={userId} showTeamRoster={isManager} />
      </FadeIn>
    </div>
  );
}
