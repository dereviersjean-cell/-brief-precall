import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { getUserRole, getOrganizationForUser, getUserEmail, getActiveSeatCountForOrganization, getOrganizationBillingRow } from "@/lib/db";
import { createOrganizationCheckoutSession } from "@/lib/stripe";
import { APP_URL } from "@/lib/app-url";

const BILLING_URL = `${APP_URL}/settings/billing`;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const billingInterval = (body as { interval?: string }).interval === "year" ? "year" : "month";

  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const [email, seatCount, billing] = await Promise.all([
    getUserEmail(userId),
    getActiveSeatCountForOrganization(organization.id),
    getOrganizationBillingRow(organization.id),
  ]);
  if (!email) {
    return NextResponse.json({ error: "Email introuvable pour cet utilisateur." }, { status: 400 });
  }

  try {
    const { url } = await createOrganizationCheckoutSession({
      organizationId: organization.id,
      seatQuantity: Math.max(seatCount, 1),
      billingInterval,
      managerEmail: email,
      existingCustomerId: billing?.stripe_customer_id ?? null,
      successUrl: `${BILLING_URL}?checkout=success`,
      cancelUrl: `${BILLING_URL}?checkout=cancelled`,
    });
    if (!url) {
      return NextResponse.json({ error: "Impossible de créer la session de paiement." }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[settings/billing/checkout] createOrganizationCheckoutSession failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la session de paiement." }, { status: 500 });
  }
}
