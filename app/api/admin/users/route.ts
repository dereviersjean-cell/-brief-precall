import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createInvitedUser, getOrganization, type UserRole } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

// The admin backoffice has no per-admin identity (shared password auth, no
// users row for "the admin") — invited_by is left null and the email just
// credits a generic inviter.
const FALLBACK_INVITER_NAME = "L'équipe Brief";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { email, name, role, organizationId } = (await request.json()) as {
    email?: string;
    name?: string;
    role?: UserRole;
    organizationId?: string;
  };

  if (!email || !role || !organizationId) {
    return NextResponse.json({ error: "email, role et organizationId requis." }, { status: 400 });
  }
  if (role !== "manager" && role !== "commercial") {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  let userId: string;
  try {
    userId = await createInvitedUser({
      email,
      name: name?.trim() || null,
      role,
      organizationId,
      invitedBy: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // The user row is already created at this point — an email failure is
  // logged but never rolls it back, so the admin can resend later.
  try {
    const organization = await getOrganization(organizationId);
    await sendInvitationEmail({
      to: email,
      invitedByName: FALLBACK_INVITER_NAME,
      organizationName: organization?.name ?? "votre organisation",
      role,
    });
  } catch (err) {
    console.error(`[admin/users] sendInvitationEmail failed for ${email} (user ${userId} still created):`, err);
  }

  return NextResponse.json({ id: userId });
}
