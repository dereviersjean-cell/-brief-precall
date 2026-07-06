import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setUserOrganization, removeAllLinksForUser } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { userId } = await params;

  // Always clear manager_commercial_links before detaching from the org,
  // otherwise the links become orphaned references to a user with no org.
  await removeAllLinksForUser(userId);
  await setUserOrganization(userId, null);

  return NextResponse.json({ ok: true });
}
