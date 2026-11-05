import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { getOrganizationTeamByManager } from "@/lib/db";
import EquipeClient from "./EquipeClient";

export const dynamic = "force-dynamic";

// Paramètres › Équipe (05/11/2026, maquette H1 B « par manager » choisie par
// Jean) : remplace l'écran Équipe (/team), masqué depuis le 27/10. Réservé
// aux managers : chacun voit toutes les équipes de l'organisation et agit sur
// la sienne (inviter, rattacher, retirer, relancer une invitation).
export default async function EquipeSettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId) redirect("/settings/general");

  const team = await getOrganizationTeamByManager(viewer.organizationId);
  return <EquipeClient team={team} viewerId={viewer.userId} />;
}
