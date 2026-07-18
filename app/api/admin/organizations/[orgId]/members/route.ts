import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getUsersInOrganization,
  setUserOrganization,
  setUserRole,
  getUserOrganizationId,
  getUserRole,
  removeAllLinksForUser,
  type UserRole,
} from "@/lib/db";
import { syncSeatsForOrganization } from "@/lib/stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { orgId } = await params;
  const members = await getUsersInOrganization(orgId);
  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  const { userId, role } = (await request.json()) as { userId?: string; role?: UserRole };
  if (!userId || !role) {
    return NextResponse.json({ error: "userId et role requis." }, { status: 400 });
  }
  if (role !== "manager" && role !== "commercial") {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const currentOrgId = await getUserOrganizationId(userId);
  const currentRole = await getUserRole(userId);

  // Moving a user to a different org than the one they're currently in, or
  // changing their role within the same org, both invalidate their existing
  // manager_commercial_links (wrong org, or wrong side of the relationship).
  // No warning here — the client is expected to confirm with the admin first.
  const movingToDifferentOrg = currentOrgId !== null && currentOrgId !== orgId;
  const changingRoleInSameOrg = currentOrgId === orgId && currentRole !== null && currentRole !== role;
  if (movingToDifferentOrg || changingRoleInSameOrg) {
    await removeAllLinksForUser(userId);
  }

  await setUserOrganization(userId, orgId);
  await setUserRole(userId, role);

  // Best-effort — le siège Stripe est synchronisé au prochain webhook/cron de
  // toute façon si ça échoue ici, pas la peine de faire échouer la mutation.
  await syncSeatsForOrganization(orgId).catch((err) =>
    console.warn(`[admin/organizations/members] syncSeatsForOrganization(${orgId}) failed:`, err)
  );
  if (movingToDifferentOrg && currentOrgId) {
    await syncSeatsForOrganization(currentOrgId).catch((err) =>
      console.warn(`[admin/organizations/members] syncSeatsForOrganization(${currentOrgId}) failed:`, err)
    );
  }

  return NextResponse.json({ ok: true });
}
