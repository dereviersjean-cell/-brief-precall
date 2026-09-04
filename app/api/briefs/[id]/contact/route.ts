import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { enrichContact, buildContactCard } from "@/lib/apollo";
import {
  getBriefByEventId,
  updateBriefContact,
  updateManualMeetingContact,
} from "@/lib/db";

// Renseigner ou corriger le contact d'un brief déjà généré.
//
// Ne relance PAS la génération : le brief lui-même ne change pas, seule la
// fiche contact est (re)calculée. Régénérer coûterait ~54s et un appel Claude
// pour une donnée qui n'en dépend pas. L'utilisateur garde le bouton
// « Régénérer le brief » s'il veut en plus personnaliser l'accroche et les
// arguments au rôle de la personne.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: { contactEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const contactEmail = body.contactEmail?.trim();
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  // Même double forme d'identifiant que la page du brief : un id d'événement
  // d'agenda (ou d'un RDV manuel) d'abord, l'uuid du brief en repli. Le garde
  // isUuid ne protège que la requête qui touche une colonne uuid.
  let briefId: string | null = null;
  let isManualMeeting = false;
  try {
    const byEvent = await getBriefByEventId(auth.userId, id);
    if (byEvent) {
      briefId = (byEvent as { id: string }).id;
      // Un RDV manuel porte le même identifiant que l'événement du brief.
      isManualMeeting = isUuid(id);
    } else if (isUuid(id)) {
      briefId = id;
    }
  } catch (err) {
    console.error("[briefs/contact] lookup failed:", err);
    return NextResponse.json({ error: "Erreur lors de la lecture du brief." }, { status: 500 });
  }

  if (!briefId) {
    return NextResponse.json({ error: "Brief introuvable." }, { status: 404 });
  }

  try {
    const apolloContact = await enrichContact(contactEmail);
    const contactCard = buildContactCard(apolloContact, contactEmail);

    await updateBriefContact(auth.userId, briefId, contactEmail, contactCard);

    // Best-effort : si l'identifiant correspond à un RDV manuel de cet
    // utilisateur, on aligne son contact pour que les deux ne divergent pas.
    // Un échec ici ne doit pas faire échouer la mise à jour du brief, qui est
    // ce que l'utilisateur voit.
    if (isManualMeeting) {
      await updateManualMeetingContact(auth.userId, id, contactEmail).catch((err) =>
        console.error("[briefs/contact] updateManualMeetingContact failed:", err)
      );
    }

    return NextResponse.json({ contact: contactCard, enriched: apolloContact !== null });
  } catch (err) {
    console.error("[briefs/contact] update failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du contact." }, { status: 500 });
  }
}
