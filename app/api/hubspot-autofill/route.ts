import { NextResponse } from "next/server";
import { autofillGuard } from "@/lib/hubspot-autofill-guard";
import { getOrganizationHubspotAutofill, setHubspotAutoPush, setOrganizationHubspotAutofill } from "@/lib/db";
import { getHubspotTokenInfo } from "@/lib/crm/hubspot-deals";
import { listHubSpotProperties } from "@/lib/crm/hubspot-objects";
import { coerceAutofillConfig, validateLinks, type AutofillConfig } from "@/lib/hubspot-autofill";
import { COMPANY_WRITE_SCOPE } from "@/lib/hubspot-autofill-run";

// Mise à jour automatique des propriétés HubSpot (Paramètres › HubSpot) :
// la liste validée par le manager de ce que Brief remplit après chaque call,
// sur le deal, le contact et l'entreprise.

export async function GET() {
  const g = await autofillGuard();
  if ("response" in g) return g.response;
  const config = coerceAutofillConfig(await getOrganizationHubspotAutofill(g.organizationId));
  if (!g.hubspotUser) return NextResponse.json({ connected: false, config, canWriteCompanies: false });
  const canWriteCompanies = await getHubspotTokenInfo(g.hubspotUser)
    .then((t) => t.scopes.includes(COMPANY_WRITE_SCOPE))
    .catch(() => false);
  return NextResponse.json({ connected: true, config, canWriteCompanies });
}

export async function PUT(request: Request) {
  const g = await autofillGuard();
  if ("response" in g) return g.response;
  if (!g.hubspotUser) return NextResponse.json({ error: "HubSpot n'est pas connecté." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as { links?: unknown; active?: unknown } | null;
  // Le contrat est celui du serveur : la liste reçue est relue comme une
  // configuration, puis confrontée aux propriétés réelles du HubSpot.
  const received = coerceAutofillConfig({ active: body?.active === true, links: body?.links, validatedAt: null, validatedBy: null });
  if (!received) return NextResponse.json({ error: "Liste invalide." }, { status: 400 });

  let links;
  try {
    // L'un après l'autre : un renouvellement de jeton ne doit pas se faire à trois.
    const deal = await listHubSpotProperties(g.hubspotUser, "deal");
    const [contact, company] = await Promise.all([listHubSpotProperties(g.hubspotUser, "contact"), listHubSpotProperties(g.hubspotUser, "company")]);
    links = validateLinks(received.links, { deal, contact, company });
  } catch {
    return NextResponse.json({ error: "Lecture des propriétés HubSpot impossible." }, { status: 502 });
  }
  const active = received.active && links.some((l) => l.enabled);
  const config: AutofillConfig = { active, links, validatedAt: new Date().toISOString(), validatedBy: g.userId };
  try {
    await setOrganizationHubspotAutofill(g.organizationId, config);
    // Activer vaut aussi « mettre à jour HubSpot après chaque call ».
    if (active) await setHubspotAutoPush(g.organizationId, true);
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible. La migration 042 a-t-elle été passée ?" }, { status: 500 });
  }
  return NextResponse.json({ config });
}
