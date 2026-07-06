import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getUserForInvitation, getOrganization } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

const FALLBACK_INVITER_NAME = "L'équipe Brief";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { userId } = await params;
  const user = await getUserForInvitation(userId);
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
  if (!user.role || !user.organization_id) {
    return NextResponse.json(
      { error: "Cet utilisateur n'a pas de rôle ou d'organisation définis." },
      { status: 400 }
    );
  }

  const organization = await getOrganization(user.organization_id);

  let invitedByName = FALLBACK_INVITER_NAME;
  if (user.invited_by) {
    const inviter = await getUserForInvitation(user.invited_by);
    if (inviter) invitedByName = inviter.name || inviter.email;
  }

  try {
    await sendInvitationEmail({
      to: user.email,
      invitedByName,
      organizationName: organization?.name ?? "votre organisation",
      role: user.role,
    });
  } catch (err) {
    console.error(`[resend-invitation] sendInvitationEmail failed for ${user.email}:`, err);
    return NextResponse.json({ error: "Échec de l'envoi de l'email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
