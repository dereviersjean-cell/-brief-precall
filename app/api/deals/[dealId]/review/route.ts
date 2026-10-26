import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { getDealOrganizationId, isDealMemoryEnabledForOrganization, saveDealReview } from "@/lib/db";

// « Vu » / « Plus tard » sur un deal de la vue manager (Deal Execution,
// étape 4). Le deal doit appartenir à l'organisation du manager.
export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return NextResponse.json({ error: "Indisponible." }, { status: 404 });
  }

  const { dealId } = await params;
  if (!isUuid(dealId) || (await getDealOrganizationId(dealId)) !== auth.organizationId) {
    return NextResponse.json({ error: "Deal introuvable." }, { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { status?: unknown; alertRules?: unknown } | null;
  if (body?.status !== "seen" && body?.status !== "later") {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const alertRules = Array.isArray(body.alertRules) ? body.alertRules.filter((r): r is string => typeof r === "string").slice(0, 20) : [];

  await saveDealReview(dealId, auth.userId, body.status, alertRules);
  return NextResponse.json({ ok: true });
}
