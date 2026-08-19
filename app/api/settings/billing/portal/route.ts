import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getOrganizationForUser, getOrganizationBillingRow } from "@/lib/db";
import { createBillingPortalSession } from "@/lib/stripe";
import { APP_URL } from "@/lib/app-url";

const BILLING_URL = `${APP_URL}/settings/billing`;

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const billing = await getOrganizationBillingRow(organization.id);
  if (!billing?.stripe_customer_id) {
    return NextResponse.json({ error: "Aucun abonnement actif pour cette organisation." }, { status: 400 });
  }

  try {
    const { url } = await createBillingPortalSession(billing.stripe_customer_id, BILLING_URL);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[settings/billing/portal] createBillingPortalSession failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la session." }, { status: 500 });
  }
}
