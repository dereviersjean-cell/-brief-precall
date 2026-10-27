import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getHubspotLinkedCalls } from "@/lib/db";
import { HUBSPOT_SKIP_MESSAGES, simulateHubspotPush } from "@/lib/deal-memory-hubspot-push";
import { DEAL_MEMORY_FIELDS } from "@/lib/deal-memory-schema";
import type { HubspotMapping } from "@/lib/hubspot-mapping";
import { briefPropertyName, entryFor, type SetupChoice } from "@/lib/hubspot-setup";
import { isUuid } from "@/lib/uuid";

// Setup HubSpot (admin) : ce qu'un envoi d'un call réel du client écrirait
// avec les choix en cours, avant de les appliquer. Rien n'est écrit.
export async function POST(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const { orgId } = await params;
  if (!isUuid(orgId)) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { callId?: string; choices?: Record<string, SetupChoice> } | null;
  const call = (await getHubspotLinkedCalls(orgId, 50)).find((c) => c.id === body?.callId);
  if (!call) return NextResponse.json({ error: "Call introuvable pour ce client." }, { status: 404 });

  const mapping: HubspotMapping = {};
  const planned: string[] = [];
  for (const field of DEAL_MEMORY_FIELDS) {
    const choice = body?.choices?.[field.key];
    if (!choice) continue;
    const entry = entryFor(field.key, choice);
    if (entry) mapping[field.key] = entry;
    if (choice.kind === "create") planned.push(briefPropertyName(field.key));
  }
  try {
    const result = await simulateHubspotPush(call, orgId, { mapping, planned });
    if ("status" in result) return NextResponse.json({ error: HUBSPOT_SKIP_MESSAGES[result.reason] }, { status: 400 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: `Simulation impossible : ${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
  }
}
