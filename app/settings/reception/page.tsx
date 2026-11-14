import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getEnabledModulesForUser, getOrganizationUserIds, getTeamNotificationPreferences, isDealAlertsEnabledForOrganization } from "@/lib/db";
import { DEAL_ALERT_EVENT, RECEPTION_CHANNELS, RECEPTION_EVENTS } from "@/lib/reception";
import ReceptionClient from "./ReceptionClient";

export const dynamic = "force-dynamic";

// Paramètres › Réception (maquette A choisie par Jean le 14/11/2026) : où
// l'équipe reçoit le brief et l'analyse. Réservé aux managers, qui règlent
// pour toute l'organisation.
export default async function ReceptionSettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/settings/general");

  const [userIds, modules, alertsActive] = await Promise.all([
    getOrganizationUserIds(viewer.userId),
    getEnabledModulesForUser(viewer.userId),
    isDealAlertsEnabledForOrganization(viewer.organizationId).catch(() => false),
  ]);
  const counts = await getTeamNotificationPreferences(userIds).catch(() => ({ on: {}, off: {} }) as { on: Record<string, number>; off: Record<string, number> });
  // Une case est cochée quand toute l'équipe a ce réglage ; pour ce qui part
  // par défaut (les alertes), tant que personne ne l'a coupé.
  const enabled: Record<string, boolean> = {};
  let partial = false;
  for (const event of RECEPTION_EVENTS) {
    for (const channel of RECEPTION_CHANNELS) {
      const key = `${event.key}:${channel.key}`;
      const on = counts.on[key] ?? 0;
      enabled[key] = event.defaultOn ? (counts.off[key] ?? 0) === 0 : on >= userIds.length;
      if (!event.defaultOn && on > 0 && on < userIds.length) partial = true;
    }
  }
  return (
    <ReceptionClient
      initial={enabled}
      members={userIds.length}
      slack={modules.includes("slack")}
      partial={partial}
      // Les alertes ne partent que là où Brief les a allumées pour le compte.
      inactive={alertsActive ? [] : [DEAL_ALERT_EVENT]}
    />
  );
}
