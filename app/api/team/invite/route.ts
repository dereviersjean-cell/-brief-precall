import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getOrganizationForUser,
  createInvitedUser,
  linkManagerToCommercial,
  getUserForInvitation,
} from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    return NextResponse.json(
      {
        error:
          "Vous devez être rattaché à une organisation pour inviter un collaborateur. Contactez votre administrateur.",
      },
      { status: 400 }
    );
  }

  const { email, name } = (await request.json()) as { email?: string; name?: string };
  if (!email || !email.trim()) {
    return NextResponse.json({ error: "email requis." }, { status: 400 });
  }

  // role is always 'commercial' here — a manager can only create commercials,
  // any role value the client might send is simply never read.
  let commercialId: string;
  try {
    commercialId = await createInvitedUser({
      email: email.trim(),
      name: name?.trim() || null,
      role: "commercial",
      organizationId: organization.id,
      invitedBy: userId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Best-effort — the account already exists at this point regardless.
  try {
    await linkManagerToCommercial(userId, commercialId);
  } catch (err) {
    console.error(`[team/invite] linkManagerToCommercial failed for ${commercialId}:`, err);
  }

  try {
    const manager = await getUserForInvitation(userId);
    await sendInvitationEmail({
      to: email.trim(),
      invitedByName: manager?.name || manager?.email || "Votre manager",
      organizationName: organization.name,
      role: "commercial",
    });
  } catch (err) {
    console.error(`[team/invite] sendInvitationEmail failed for ${email}:`, err);
  }

  return NextResponse.json({ id: commercialId });
}
