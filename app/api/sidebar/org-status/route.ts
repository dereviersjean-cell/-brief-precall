import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getOrganizationForUser, getOrganizationBillingRow, getActiveSeatCountForOrganization } from "@/lib/db";

// Feeds the sidebar's org name subtitle + "Essai actif" billing card
// (AppSidebar.tsx) — a client component can't hit lib/db.ts directly.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const org = await getOrganizationForUser(auth.userId);
  if (!org) {
    return NextResponse.json({ organizationName: null, billingStatus: "none", trialEndsAt: null, seatCount: 0 });
  }

  const [billing, seatCount] = await Promise.all([
    getOrganizationBillingRow(org.id),
    getActiveSeatCountForOrganization(org.id),
  ]);

  return NextResponse.json({
    organizationName: org.name,
    billingStatus: billing?.billing_status ?? "none",
    trialEndsAt: billing?.trial_ends_at ?? null,
    seatCount,
  });
}
