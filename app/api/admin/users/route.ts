import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createInvitedUser, getOrganization, type UserRole } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

// L'admin n'a pas d'identité (mot de passe partagé) : ses invitations sont
// signées au nom de Brief.
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

  // Une invitation envoyée depuis l'admin est signée « L'équipe Brief »,
  // toujours (décision de Jean, 29/09/2026). Avant, elle créditait le compte
  // connecté à l'application dans le même navigateur — ce qui signait au nom
  // Google de la personne, au hasard de sa session.
  const invitedBy = null;

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
    const invitedByName = FALLBACK_INVITER_NAME;

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
