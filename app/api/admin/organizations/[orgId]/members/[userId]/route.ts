import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setUserOrganization, removeAllLinksForUser } from "@/lib/db";
import { syncSeatsForOrganization } from "@/lib/stripe";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId, userId } = await params;

  // Always clear manager_commercial_links before detaching from the org,
  // otherwise the links become orphaned references to a user with no org.
  await removeAllLinksForUser(userId);
  await setUserOrganization(userId, null);

  // Best-effort — le siège Stripe est synchronisé au prochain webhook/cron de
  // toute façon si ça échoue ici, pas la peine de faire échouer la mutation.
  await syncSeatsForOrganization(orgId).catch((err) =>
    console.warn(`[admin/organizations/members/:userId] syncSeatsForOrganization(${orgId}) failed:`, err)
  );

  return NextResponse.json({ ok: true });
}
