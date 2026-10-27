import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { getCallWithAnalysis, getCallWithAnalysisForManager, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { HUBSPOT_SKIP_MESSAGES, pushDealMemoryToHubSpot } from "@/lib/deal-memory-hubspot-push";
import { reportError } from "@/lib/monitoring";

// Envoie la fiche d'un call dans le deal HubSpot rattaché (Deal Execution,
// étape 3). Depuis le 27/10/2026 l'envoi part tout seul après chaque call
// (generateDealMemoryAfterCall) ; ce bouton sert à renvoyer, après une
// régénération par exemple.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return NextResponse.json({ error: "Fiche deal indisponible." }, { status: 404 });
  }

  const { id: callId } = await params;
  if (!isUuid(callId)) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });
  const call = (await getCallWithAnalysis(callId, auth.userId)) ?? (await getCallWithAnalysisForManager(callId, auth.userId));
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  try {
    const result = await pushDealMemoryToHubSpot(call, auth.organizationId, [auth.userId, call.user_id]);
    if (result.status === "skipped") return NextResponse.json({ error: HUBSPOT_SKIP_MESSAGES[result.reason] }, { status: 400 });
    return NextResponse.json({ pushedAt: result.pushedAt, properties: result.properties });
  } catch (err) {
    reportError("deal-memory.hubspotPush", err, { callId });
    return NextResponse.json({ error: err instanceof Error ? err.message : "L'envoi dans HubSpot a échoué." }, { status: 502 });
  }
}
