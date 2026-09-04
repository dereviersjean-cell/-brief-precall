import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { enrichContact, buildContactCard } from "@/lib/apollo";
import {
  getBriefByEventId,
  getBriefByIdForUser,
  updateBriefContact,
  updateManualMeetingContact,
} from "@/lib/db";

// Renseigner ou corriger le contact d'un brief déjà généré.
//
// Accepte un email, un nom, ou les deux : le nom accompagné de l'entreprise
// du brief suffit à retrouver la personne, et c'est souvent tout ce que le
// commercial connaît avant un rendez-vous — une adresse se devine mal (cf.
// le commentaire de enrichContact).
//
// Ne relance PAS la génération : le brief lui-même ne change pas, seule la
// fiche contact est (re)calculée. Régénérer coûterait ~54s et un appel Claude
// pour une donnée qui n'en dépend pas. Le bouton « Régénérer le brief » reste
// disponible pour qui veut en plus personnaliser l'accroche au rôle du
// contact.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: { contactEmail?: string; contactName?: string; companyName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const contactEmail = body.contactEmail?.trim() || null;
  const contactName = body.contactName?.trim() || null;
  // L'entreprise peut être corrigée par l'utilisateur : le nom stocké dans le
  // brief est celui qu'il a tapé (« Bewtr »), pas forcément celui sous lequel
  // l'annuaire connaît la société (« BE WTR ») — et la recherche échoue
  // silencieusement sur cet écart. Mesuré le 04/09/2026 : même personne,
  // même nom, seul le nom d'entreprise changeait entre l'échec et le succès.
  const companyOverride = body.companyName?.trim() || null;

  if (!contactEmail && !contactName) {
    return NextResponse.json(
      { error: "Renseignez au moins un nom ou une adresse email." },
      { status: 400 }
    );
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  // Même double forme d'identifiant que la page du brief : un id d'événement
  // d'agenda (ou d'un RDV manuel) d'abord, l'uuid du brief en repli. Le garde
  // isUuid ne protège que la requête qui touche une colonne uuid.
  let briefId: string | null = null;
  let companyName: string | null = null;
  let isManualMeeting = false;
  try {
    const byEvent = await getBriefByEventId(auth.userId, id);
    if (byEvent) {
      const row = byEvent as { id: string; company_name: string | null };
      briefId = row.id;
      companyName = row.company_name;
      // Un RDV manuel porte le même identifiant que l'événement du brief.
      isManualMeeting = isUuid(id);
    } else if (isUuid(id)) {
      const byId = await getBriefByIdForUser(id, auth.userId);
      if (byId) {
        briefId = id;
        companyName = byId.company_name;
      }
    }
  } catch (err) {
    console.error("[briefs/contact] lookup failed:", err);
    return NextResponse.json({ error: "Erreur lors de la lecture du brief." }, { status: 500 });
  }

  if (!briefId) {
    return NextResponse.json({ error: "Brief introuvable." }, { status: 404 });
  }

  try {
    const apolloContact = await enrichContact({
      email: contactEmail,
      name: contactName,
      companyName: companyOverride ?? companyName,
      // Le domaine de l'adresse saisie est un meilleur critère que le nom
      // d'entreprise quand on l'a — sauf s'il est justement faux, d'où le
      // repli sur companyName dans enrichContact.
      domain: contactEmail ? contactEmail.split("@")[1] ?? null : null,
    });
    const contactCard = buildContactCard(apolloContact, { email: contactEmail, name: contactName });

    // L'adresse retenue peut venir d'Apollo (corrige une saisie erronée) ;
    // elle n'est enregistrée que si on en a réellement une — un contact
    // identifié par son seul nom reste valable.
    const resolvedEmail = contactCard.email ?? null;
    await updateBriefContact(auth.userId, briefId, resolvedEmail, contactCard);

    // Best-effort : si l'identifiant correspond à un RDV manuel de cet
    // utilisateur, on aligne son contact pour que les deux ne divergent pas.
    // Un échec ici ne doit pas faire échouer la mise à jour du brief, qui est
    // ce que l'utilisateur voit.
    if (isManualMeeting && resolvedEmail) {
      await updateManualMeetingContact(auth.userId, id, resolvedEmail).catch((err) =>
        console.error("[briefs/contact] updateManualMeetingContact failed:", err)
      );
    }

    return NextResponse.json({ contact: contactCard, enriched: apolloContact !== null });
  } catch (err) {
    console.error("[briefs/contact] update failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du contact." }, { status: 500 });
  }
}
