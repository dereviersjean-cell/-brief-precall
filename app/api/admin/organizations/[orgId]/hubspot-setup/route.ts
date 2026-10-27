import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getHubspotUserForOrganization, setHubspotAutoPush, setOrganizationDealRules, setOrganizationHubspotMapping } from "@/lib/db";
import { coerceDealRules } from "@/lib/deal-rules";
import { createBriefDealProperty, getHubspotScopes, listHubSpotDealProperties } from "@/lib/crm/hubspot-deals";
import { DEAL_MEMORY_FIELDS } from "@/lib/deal-memory-schema";
import { serializeMapping, type HubspotMapping } from "@/lib/hubspot-mapping";
import { briefPropertyLabel, briefPropertyName, entryFor, typeCompatible, type SetupChoice } from "@/lib/hubspot-setup";
import { loadHubspotSetup } from "@/lib/hubspot-setup-load";
import { isUuid } from "@/lib/uuid";

// Setup HubSpot d'un client (admin, 27/10/2026) : GET = le diagnostic et la
// proposition ; PUT = appliquer les choix faits en call — les règles des deals
// (méthode, objectifs de chaque rendez-vous, seuils, critères par étape),
// puis, si HubSpot est connecté, créer les propriétés retenues dans le groupe
// « Brief », enregistrer le réglage, allumer ou couper la mise à jour
// automatique.

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { orgId } = await params;
  if (!isUuid(orgId)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  try {
    return NextResponse.json(await loadHubspotSetup(orgId));
  } catch (err) {
    return NextResponse.json({ error: `Lecture du HubSpot du client impossible : ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { orgId } = await params;
  if (!isUuid(orgId)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { choices?: Record<string, SetupChoice>; autoPush?: unknown; rules?: unknown } | null;
  if (body?.rules) {
    try {
      await setOrganizationDealRules(orgId, coerceDealRules(body.rules));
    } catch {
      return NextResponse.json({ error: "Enregistrement des règles impossible." }, { status: 500 });
    }
  }
  const hubspotUser = await getHubspotUserForOrganization(orgId, []);
  if (!hubspotUser || !body?.choices) return NextResponse.json({ ok: true, created: [], hubspot: hubspotUser ? "unchanged" : "not-connected" });

  // Chaque choix est revérifié contre le HubSpot du client : propriété
  // existante, modifiable, de type compatible, option présente.
  const definitions = new Map((await listHubSpotDealProperties(hubspotUser)).map((p) => [p.name, p]));
  const mapping: HubspotMapping = {};
  const toCreate: (typeof DEAL_MEMORY_FIELDS)[number]["key"][] = [];
  for (const field of DEAL_MEMORY_FIELDS) {
    const choice = body?.choices?.[field.key];
    if (!choice || choice.kind === "note") continue;
    if (choice.kind === "existing") {
      const def = definitions.get(choice.property);
      if (!def || def.readOnly || def.type !== choice.type || !typeCompatible(field.key, def.type)) {
        return NextResponse.json({ error: `${field.label} : la propriété « ${choice.property} » ne convient pas (absente, en lecture seule ou de mauvais type).` }, { status: 400 });
      }
      const values = def.type === "bool" ? ["true", "false"] : def.options.map((o) => o.value);
      for (const option of [choice.options?.confirme, choice.options?.evoque]) {
        if (option && !values.includes(option)) return NextResponse.json({ error: `${field.label} : l'option « ${option} » n'existe pas.` }, { status: 400 });
      }
    } else if (!definitions.has(briefPropertyName(field.key))) {
      toCreate.push(field.key);
    }
    const entry = entryFor(field.key, choice);
    if (entry) mapping[field.key] = entry;
  }

  const created: string[] = [];
  if (toCreate.length > 0) {
    const scopes = await getHubspotScopes(hubspotUser).catch(() => [] as string[]);
    if (!scopes.includes("crm.schemas.deals.write")) {
      return NextResponse.json(
        { error: "La connexion HubSpot du client n'a pas le droit de créer des propriétés : il doit reconnecter HubSpot (Paramètres › Connexions)." },
        { status: 403 }
      );
    }
    for (const key of toCreate) {
      const field = DEAL_MEMORY_FIELDS.find((f) => f.key === key)!;
      const result = await createBriefDealProperty(hubspotUser, {
        name: briefPropertyName(key),
        label: briefPropertyLabel(key),
        description: `Rempli par Brief après chaque call : ${field.definition}.`,
      });
      if (result === "created") created.push(briefPropertyLabel(key));
    }
  }

  await setOrganizationHubspotMapping(orgId, serializeMapping(mapping));
  if (typeof body?.autoPush === "boolean") await setHubspotAutoPush(orgId, body.autoPush);
  return NextResponse.json({ ok: true, created, hubspot: "applied" });
}
