import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import {
  getUserRole,
  getOrganizationForUser,
  getTeamMemberForManager,
  getUserForInvitation,
} from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";
import { isPendingInvitation } from "@/lib/team-invitation";

// Renvoyer l'invitation d'un membre de son équipe, côté manager.
//
// Le backoffice admin savait déjà le faire, pas l'application. Un manager qui
// invitait un commercial et dont l'email d'invitation échouait n'avait aucune
// issue : le compte existait, donc il ne pouvait pas réinviter, et rien ne lui
// permettait de relancer. C'est arrivé le 31/08/2026 quand une clé Resend
// restreinte au mauvais domaine a fait échouer l'envoi en silence.
//
// Contrairement à la route de création, cette route REMONTE l'échec d'envoi.
// C'est sa raison d'être : elle sert quand l'envoi a déjà échoué une fois.
export async function POST(_request: Request, { params }: { params: Promise<{ commercialId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  // Depuis la base, pas le JWT : le rôle peut y avoir jusqu'à 10 min de retard.
  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const { commercialId } = await params;
  if (!isUuid(commercialId)) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  const member = await getTeamMemberForManager(userId, commercialId);
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  if (member.has_logged_in) {
    return NextResponse.json(
      { error: "Ce collaborateur s'est déjà connecté : son invitation n'a plus lieu d'être." },
      { status: 400 }
    );
  }
  // Même définition que l'écran Équipe, pour qu'un bouton visible corresponde
  // toujours à une action que le serveur accepte.
  if (!isPendingInvitation(member)) {
    return NextResponse.json(
      { error: "Ce compte n'a pas d'invitation en attente." },
      { status: 400 }
    );
  }

  const [organization, manager] = await Promise.all([
    getOrganizationForUser(userId),
    getUserForInvitation(userId),
  ]);

  try {
    await sendInvitationEmail({
      to: member.email,
      invitedByName: manager?.name || manager?.email || "Votre manager",
      organizationName: organization?.name ?? "votre organisation",
      role: "commercial",
    });
  } catch (err) {
    console.error(`[team/resend-invitation] sendInvitationEmail failed for ${member.email}:`, err);
    return NextResponse.json(
      { error: "L'email n'a pas pu être envoyé. Réessayez dans un instant." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, email: member.email });
}
