import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getEnabledModulesForUser, getOrganizationUserIds, getTeamNotificationPreferences } from "@/lib/db";
import ReceptionClient from "./ReceptionClient";

export const dynamic = "force-dynamic";

// Paramètres › Réception (maquette A choisie par Jean le 14/11/2026) : où
// l'équipe reçoit le brief et l'analyse. Réservé aux managers, qui règlent
// pour toute l'organisation.
export default async function ReceptionSettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/settings/general");

  const [userIds, modules] = await Promise.all([getOrganizationUserIds(viewer.userId), getEnabledModulesForUser(viewer.userId)]);
  const counts = await getTeamNotificationPreferences(userIds).catch(() => ({}) as Record<string, number>);
  // Une case est cochée quand toute l'équipe a ce réglage.
  const enabled = Object.fromEntries(Object.entries(counts).map(([key, n]) => [key, n >= userIds.length]));
  const partial = Object.entries(counts).some(([, n]) => n > 0 && n < userIds.length);
  return <ReceptionClient initial={enabled} members={userIds.length} slack={modules.includes("slack")} partial={partial} />;
}
