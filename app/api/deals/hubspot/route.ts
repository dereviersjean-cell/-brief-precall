import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isDealMemoryEnabledForOrganization } from "@/lib/db";
import { loadHubspotOverview } from "@/lib/hubspot-overview-load";

// L'onglet HubSpot de Deals de l'équipe (27/10/2026) : lecture seule, managers
// des organisations en test. Les réglages s'enregistrent par
// /api/deal-memory/hubspot-mapping, comme depuis la fiche d'un call.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return NextResponse.json({ error: "Indisponible." }, { status: 404 });
  }
  return NextResponse.json(await loadHubspotOverview(auth.organizationId, auth.userId));
}
