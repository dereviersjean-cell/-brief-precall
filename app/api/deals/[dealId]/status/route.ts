import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import {
  createClientReference,
  getClientReferencesForUsers,
  getCommercialsForManager,
  getDealPageFiches,
  getHubspotUserForOrganization,
  setDealHubspot,
  getOrganizationUserIds,
  isDealMemoryEnabledForOrganization,
  setDealClosure,
} from "@/lib/db";
import { itemLevel } from "@/lib/call-objectives";
import { reportWarning } from "@/lib/monitoring";
import { closeHubSpotDeal } from "@/lib/crm/hubspot-deals";

const STATUSES = ["gagne", "perdu", "abandonne"] as const;

// Clôt ou rouvre un deal depuis sa page (migration 043, décision D8) : le
// commercial du deal ou son manager. Gagné et Perdu passent aussi le deal à
// l'étape fermée de son pipeline HubSpot (décision de Jean du 16/11/2026) ;
// Abandonné et Rouvrir ne touchent pas à HubSpot. Un deal gagné entre dans
// les références de l'équipe (décision G8) s'il n'y est pas déjà.
export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  const organizationId = auth.organizationId;
  if (!organizationId || !(await isDealMemoryEnabledForOrganization(organizationId))) {
    return NextResponse.json({ error: "Indisponible." }, { status: 404 });
  }

  const { dealId } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status === null ? null : STATUSES.find((s) => s === body?.status);
  if (!isUuid(dealId) || status === undefined) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const fiches = await getDealPageFiches(dealId, organizationId);
  const latest = fiches?.[fiches.length - 1];
  if (!fiches || !latest) return NextResponse.json({ error: "Deal introuvable." }, { status: 404 });
  const owners = new Set(fiches.map((f) => f.ownerId));
  const allowed = owners.has(auth.userId) || (auth.role === "manager" && (await getCommercialsForManager(auth.userId)).some((c) => owners.has(c.id)));
  if (!allowed) return NextResponse.json({ error: "Deal introuvable." }, { status: 404 });

  try {
    await setDealClosure(organizationId, dealId, status, auth.userId);
  } catch (err) {
    reportWarning("deal.closure", err, { dealId });
    return NextResponse.json({ error: "La clôture n'est pas encore disponible sur ce compte." }, { status: 503 });
  }

  // HubSpot : "updated", "failed" (l'écran le dit, le deal reste clos dans
  // Brief) ou "none" (deal pas relié, ou rien à y écrire).
  let hubspot: "updated" | "failed" | "none" = "none";
  const hubspotDealId = latest.hubspot?.id;
  if (hubspotDealId && (status === "gagne" || status === "perdu")) {
    try {
      const hubspotUser = await getHubspotUserForOrganization(organizationId, [latest.ownerId, auth.userId]);
      const snapshot = hubspotUser ? await closeHubSpotDeal(hubspotUser, hubspotDealId, status) : null;
      if (snapshot) await setDealHubspot(dealId, snapshot);
      hubspot = snapshot ? "updated" : "failed";
    } catch (err) {
      reportWarning("deal.closure.hubspot", err, { dealId });
      hubspot = "failed";
    }
  }

  if (status === "gagne") {
    after(async () => {
      try {
        const existing = await getClientReferencesForUsers(await getOrganizationUserIds(auth.userId));
        const name = latest.dealName.trim();
        if (existing.some((r) => (r.client_name ?? "").trim().toLowerCase() === name.toLowerCase())) return;
        // Le problème confirmé par le prospect, s'il y en a un : c'est ce
        // qui rapprochera cette référence d'un futur prospect.
        const pains = fiches.flatMap((f) => f.fields.douleur ?? []);
        const pain = (pains.find((i) => itemLevel(i) === "confirme") ?? pains[0])?.text ?? null;
        await createClientReference(latest.ownerId, {
          client_name: name,
          sector: null,
          company_size: null,
          problem: pain,
          solution: null,
          result: null,
          raw_text: null,
          source: "deal_gagne",
        });
      } catch (err) {
        reportWarning("deal.closure.reference", err, { dealId });
      }
    });
  }

  return NextResponse.json({ ok: true, status, hubspot });
}
