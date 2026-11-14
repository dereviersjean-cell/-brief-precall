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
  getOrganizationUserIds,
  isDealMemoryEnabledForOrganization,
  setDealClosure,
} from "@/lib/db";
import { itemLevel } from "@/lib/call-objectives";
import { reportWarning } from "@/lib/monitoring";

const STATUSES = ["gagne", "perdu", "abandonne"] as const;

// Clôt ou rouvre un deal depuis sa page (migration 043, décision D8) : le
// commercial du deal ou son manager. HubSpot n'est pas modifié. Un deal gagné
// entre dans les références de l'équipe (décision G8) s'il n'y est pas déjà.
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

  return NextResponse.json({ ok: true, status });
}
