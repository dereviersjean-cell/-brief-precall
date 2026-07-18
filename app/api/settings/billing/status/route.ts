import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getOrganizationForUser, getOrganizationBillingRow } from "@/lib/db";

// Lecture seule, accessible à tout user actif (pas manager-only) — la
// bannière de fenêtre de grâce doit être visible par toute l'organisation,
// pas seulement le manager qui gère la facturation.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const organization = await getOrganizationForUser(auth.userId);
  if (!organization) {
    return NextResponse.json({ status: "none", graceEndsAt: null });
  }

  const billing = await getOrganizationBillingRow(organization.id);
  return NextResponse.json({
    status: billing?.billing_status ?? "none",
    graceEndsAt: billing?.grace_period_ends_at ?? null,
  });
}
