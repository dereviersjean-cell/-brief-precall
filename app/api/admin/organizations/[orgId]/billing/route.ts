import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateOrganizationBilling, isMissingColumnError } from "@/lib/db";

// Override côté Brief pour les cas de support (paiement par virement, litige
// en cours) — ne touche jamais le véritable abonnement Stripe.
//
// `set_exempt` (migration 028) : abonnement activé à la main. L'accès reste
// ouvert quel que soit le statut Stripe, et le reste tant que l'interrupteur
// est allumé — contrairement à `unblock`, qui écrit « active » et se fait
// réécraser par le webhook suivant si l'abonnement Stripe est bien résilié.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  const { action, exempt } = (await request.json().catch(() => ({}))) as { action?: string; exempt?: unknown };

  if (action === "set_exempt") {
    if (typeof exempt !== "boolean") {
      return NextResponse.json({ error: "exempt (booléen) requis." }, { status: 400 });
    }
    try {
      await updateOrganizationBilling(orgId, { billing_exempt: exempt });
    } catch (err) {
      if (isMissingColumnError(err as { code?: string; message?: string })) {
        return NextResponse.json({ error: "Migration 028 (billing_exempt) non appliquée en base." }, { status: 503 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  }

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

  return NextResponse.json({ error: "action invalide (attendu: set_exempt | unblock | extend_grace)." }, { status: 400 });
}
