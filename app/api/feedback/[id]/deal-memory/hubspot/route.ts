import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import {
  getCallDealMemory,
  getCallWithAnalysis,
  getCallWithAnalysisForManager,
  getDealHubspotId,
  getDealMemoryObjections,
  getDealOverview,
  getHubspotUserForOrganization,
  getOrganizationHubspotMapping,
  isDealMemoryEnabledForOrganization,
  markDealMemoryPushed,
  setDealHubspot,
} from "@/lib/db";
import { buildHubspotNote, buildHubspotProperties, effectiveMapping } from "@/lib/deal-memory-hubspot";
import { getHubSpotDealSnapshot, pushToHubSpotDeal } from "@/lib/crm/hubspot-deals";
import { reportError } from "@/lib/monitoring";

// Envoie la fiche d'un call dans le deal HubSpot rattaché (Deal Execution,
// étape 3) : les champs de qualification réglés pour l'organisation, et une
// note de synthèse. Sur action du manager pendant la phase de test — rien ne
// part tout seul.
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

  const fiche = await getCallDealMemory(callId);
  if (!fiche) return NextResponse.json({ error: "Générez d'abord la fiche de ce call." }, { status: 400 });
  const hubspotDealId = fiche.dealId ? await getDealHubspotId(fiche.dealId) : null;
  if (!fiche.dealId || !hubspotDealId) {
    return NextResponse.json({ error: "Ce call n'est rattaché à aucun deal HubSpot." }, { status: 400 });
  }
  const hubspotUser = await getHubspotUserForOrganization(auth.organizationId, [auth.userId, call.user_id]);
  if (!hubspotUser) return NextResponse.json({ error: "Personne n'a connecté HubSpot dans votre équipe." }, { status: 400 });

  try {
    const [overview, objections, orgMapping] = await Promise.all([
      getDealOverview(fiche.dealId, callId),
      getDealMemoryObjections(callId),
      getOrganizationHubspotMapping(auth.organizationId),
    ]);
    const callAt = call.started_at ?? call.created_at;
    const properties = buildHubspotProperties(overview?.memory ?? {}, effectiveMapping(orgMapping));
    const noteHtml = buildHubspotNote({
      callTitle: call.meeting_title,
      callDay: new Date(callAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }),
      content: fiche,
      badlyHandledObjections: objections
        .filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement")
        .map((o) => o.objection),
    });

    await pushToHubSpotDeal(hubspotUser, hubspotDealId, { properties, noteHtml, uid: `brief-deal-memory-${callId}` });
    const pushedAt = await markDealMemoryPushed(callId);

    // Le deal vient de changer côté HubSpot : sa photo est relue.
    const snapshot = await getHubSpotDealSnapshot(hubspotUser, hubspotDealId).catch(() => null);
    if (snapshot) await setDealHubspot(fiche.dealId, snapshot);

    return NextResponse.json({ pushedAt, properties: Object.keys(properties) });
  } catch (err) {
    reportError("deal-memory.hubspotPush", err, { callId });
    return NextResponse.json({ error: err instanceof Error ? err.message : "L'envoi dans HubSpot a échoué." }, { status: 502 });
  }
}
