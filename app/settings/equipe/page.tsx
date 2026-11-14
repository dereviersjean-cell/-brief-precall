import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getOrganizationTeamByManager } from "@/lib/db";
import EquipeClient from "./EquipeClient";

export const dynamic = "force-dynamic";

// Paramètres › Équipe (tableau, maquette H1 A choisie par Jean le 14/11/2026).
// Réservé aux managers : chacun voit toute l'organisation et agit sur sa
// propre équipe (inviter, rattacher, retirer, relancer une invitation).
export default async function EquipeSettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/settings/general");

  const team = await getOrganizationTeamByManager(viewer.organizationId);
  return <EquipeClient team={team} viewerId={viewer.userId} />;
}
