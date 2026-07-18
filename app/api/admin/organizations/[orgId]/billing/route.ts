import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateOrganizationBilling } from "@/lib/db";

// Override côté Brief pour les cas de support (paiement par virement, litige
// en cours) — ne touche jamais le véritable abonnement Stripe. Si l'abonnement
// Stripe sous-jacent est réellement résilié/impayé, un prochain webhook peut
// réécraser ce statut ; c'est un déblocage temporaire, pas une correction
// définitive de la facturation.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  const { action } = (await request.json().catch(() => ({}))) as { action?: string };

  if (action === "unblock") {
    await updateOrganizationBilling(orgId, { billing_status: "active", grace_period_ends_at: null });
    return NextResponse.json({ ok: true });
  }

  if (action === "extend_grace") {
    await updateOrganizationBilling(orgId, {
      billing_status: "grace_period",
      grace_period_ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action invalide (attendu: unblock | extend_grace)." }, { status: 400 });
}
