import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getClientDetail } from "@/lib/clients-overview";
import { isUuid } from "@/lib/uuid";
import HubspotSetupClient from "./HubspotSetupClient";

export const dynamic = "force-dynamic";

// Setup HubSpot d'un client (27/10/2026) : à mener en call avec lui, écran
// partagé — diagnostic de son HubSpot, proposition de Brief, choix, simulation
// sur un vrai call, application (lib/hubspot-setup.ts).
export default async function HubspotSetupPage({ params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin");
  const { orgId } = await params;
  if (!isUuid(orgId)) redirect("/admin/clients");
  const detail = await getClientDetail(orgId);
  if (!detail) redirect("/admin/clients");
  return <HubspotSetupClient organizationId={orgId} organizationName={detail.overview.name} />;
}
