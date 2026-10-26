import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import {
  getHubspotUserForOrganization,
  getOrganizationHubspotMapping,
  isDealMemoryEnabledForOrganization,
  setOrganizationHubspotMapping,
} from "@/lib/db";
import { listHubSpotDealTextProperties } from "@/lib/crm/hubspot-deals";
import { DEAL_MEMORY_FIELDS } from "@/lib/deal-memory-schema";
import { effectiveMapping } from "@/lib/deal-memory-hubspot";

// Où chaque champ de la fiche s'écrit dans le HubSpot de l'organisation
// (Deal Execution, étape 3). Réglé au setup avec le manager, modifiable
// ensuite par lui : Brief s'adapte aux propriétés que le client utilise déjà.

async function guard() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return { response: auth.response } as const;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return { response: NextResponse.json({ error: "Fiche deal indisponible." }, { status: 404 }) } as const;
  }
  return { userId: auth.userId, organizationId: auth.organizationId } as const;
}

export async function GET() {
  const g = await guard();
  if ("response" in g) return g.response;
  const hubspotUser = await getHubspotUserForOrganization(g.organizationId, [g.userId]);
  const mapping = effectiveMapping(await getOrganizationHubspotMapping(g.organizationId));
  if (!hubspotUser) return NextResponse.json({ connected: false, properties: [], mapping });
  try {
    const properties = await listHubSpotDealTextProperties(hubspotUser);
    return NextResponse.json({ connected: true, properties, mapping });
  } catch {
    return NextResponse.json({ error: "Lecture des propriétés HubSpot impossible." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const g = await guard();
  if ("response" in g) return g.response;
  const body = (await request.json().catch(() => null)) as { mapping?: Record<string, unknown> } | null;
  const hubspotUser = await getHubspotUserForOrganization(g.organizationId, [g.userId]);
  if (!hubspotUser) return NextResponse.json({ error: "HubSpot n'est pas connecté." }, { status: 400 });

  // Seules les propriétés réellement présentes dans le HubSpot du client sont
  // acceptées : une faute de frappe ferait échouer chaque envoi.
  const known = new Set((await listHubSpotDealTextProperties(hubspotUser)).map((p) => p.name));
  const mapping: Record<string, string> = {};
  for (const field of DEAL_MEMORY_FIELDS) {
    const value = body?.mapping?.[field.key];
    if (value === "") mapping[field.key] = "";
    else if (typeof value === "string" && known.has(value)) mapping[field.key] = value;
  }
  await setOrganizationHubspotMapping(g.organizationId, mapping);
  return NextResponse.json({ mapping: effectiveMapping(mapping) });
}
