import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createInvitedUser, getOrganization, getUserForInvitation, type UserRole } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

// The admin backoffice itself has no identity (shared password auth) — but
// the person operating it may also be logged into the app via NextAuth (e.g.
// a manager with admin access). When that's the case we credit them as the
// inviter; otherwise invited_by stays null and the email uses a generic name.
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

  const session = await getServerSession(authOptions);
  const invitedBy = session?.supabaseUserId ?? null;

  let userId: string;
  try {
    userId = await createInvitedUser({
      email,
      name: name?.trim() || null,
      role,
      organizationId,
      invitedBy,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // The user row is already created at this point — an email failure is
  // logged but never rolls it back, so the admin can resend later.
  try {
    const organization = await getOrganization(organizationId);
    const inviter = invitedBy ? await getUserForInvitation(invitedBy) : null;
    const invitedByName = inviter ? inviter.name || inviter.email : FALLBACK_INVITER_NAME;

    await sendInvitationEmail({
      to: email,
      invitedByName,
      organizationName: organization?.name ?? "votre organisation",
      role,
    });
  } catch (err) {
    console.error(`[admin/users] sendInvitationEmail failed for ${email} (user ${userId} still created):`, err);
  }

  return NextResponse.json({ id: userId });
}
