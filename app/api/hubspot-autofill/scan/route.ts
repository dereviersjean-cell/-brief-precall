import { NextResponse } from "next/server";
import { autofillGuard } from "@/lib/hubspot-autofill-guard";
import { listHubSpotProperties } from "@/lib/crm/hubspot-objects";
import { AUTOFILL_OBJECTS, candidateProperties, type AutofillObject } from "@/lib/hubspot-autofill";

// Lecture des propriétés d'un objet HubSpot : appelée trois fois de suite par
// l'écran d'attente (deals, contacts, entreprises). Rien n'est écrit.
export async function GET(request: Request) {
  const g = await autofillGuard();
  if ("response" in g) return g.response;
  if (!g.hubspotUser) return NextResponse.json({ error: "HubSpot n'est pas connecté." }, { status: 400 });
  const object = new URL(request.url).searchParams.get("object") as AutofillObject | null;
  if (!object || !AUTOFILL_OBJECTS.includes(object)) return NextResponse.json({ error: "Objet inconnu." }, { status: 400 });
  try {
    const properties = await listHubSpotProperties(g.hubspotUser, object);
    return NextResponse.json({ total: properties.length, candidates: candidateProperties(object, properties).length });
  } catch {
    return NextResponse.json({ error: "Lecture des propriétés HubSpot impossible." }, { status: 502 });
  }
}
