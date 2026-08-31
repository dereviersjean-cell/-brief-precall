import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import {
  getUserRole,
  getOrganizationForUser,
  getTeamMemberForManager,
  hardDeleteUser,
} from "@/lib/db";
import { syncSeatsForOrganization } from "@/lib/stripe";
import { isPendingInvitation } from "@/lib/team-invitation";

// Annuler une invitation en attente, côté manager.
//
// Volontairement limité aux comptes qui ne se sont JAMAIS connectés : c'est une
// annulation d'invitation, pas une suppression de collaborateur. Un membre actif
// porte des calls, des briefs et des analyses ; l'effacer est une décision qui
// reste au backoffice admin, avec sa confirmation explicite.
//
// Sert au cas de la faute de frappe dans l'adresse : sans ça, le compte erroné
// reste dans l'équipe pour toujours et occupe un siège.
export async function DELETE(_request: Request, { params }: { params: Promise<{ commercialId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const { commercialId } = await params;
  if (!isUuid(commercialId)) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  // Un manager ne peut pas se retirer lui-même par cette voie.
  if (commercialId === userId) {
    return NextResponse.json({ error: "Action impossible sur votre propre compte." }, { status: 400 });
  }

  const member = await getTeamMemberForManager(userId, commercialId);
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  }

  if (member.has_logged_in) {
    return NextResponse.json(
      {
        error:
          "Ce collaborateur s'est déjà connecté : son compte ne peut pas être annulé depuis ici. Contactez votre administrateur.",
      },
      { status: 400 }
    );
  }

  if (!isPendingInvitation(member)) {
    return NextResponse.json(
      { error: "Ce compte n'a pas d'invitation en attente." },
      { status: 400 }
    );
  }

  const organization = await getOrganizationForUser(userId);

  try {
    await hardDeleteUser(commercialId);
  } catch (err) {
    console.error(`[team/invitation] hardDeleteUser failed for ${commercialId}:`, err);
    return NextResponse.json({ error: "L'annulation a échoué." }, { status: 500 });
  }

  // Best-effort : un siège se libère. Le cron/webhook Stripe rattrape sinon.
  if (organization) {
    await syncSeatsForOrganization(organization.id).catch((err) =>
      console.warn(`[team/invitation] syncSeatsForOrganization(${organization.id}) failed:`, err)
    );
  }

  return NextResponse.json({ ok: true });
}
