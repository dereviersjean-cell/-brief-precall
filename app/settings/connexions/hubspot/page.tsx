import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session-user";
import { isDealMemoryEnabledForOrganization } from "@/lib/db";
import HubspotAutofillClient from "./HubspotAutofillClient";

export const dynamic = "force-dynamic";

// Paramètres › Connexions › HubSpot (10/11/2026, maquette A choisie par
// Jean) : ce que Brief remplit dans HubSpot après chaque call. Brief propose
// lui-même la liste en lisant le HubSpot du client, le manager la valide une
// fois. Réservé aux managers des organisations où la fiche deal est active.
export default async function HubspotAutofillPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.role !== "manager" || !viewer.organizationId || !(await isDealMemoryEnabledForOrganization(viewer.organizationId))) {
    redirect("/settings/connexions");
  }
  return <HubspotAutofillClient />;
}
