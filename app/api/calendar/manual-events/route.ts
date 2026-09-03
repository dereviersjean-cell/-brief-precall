import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { createManualMeeting } from "@/lib/db";

// Ajout manuel d'un rendez-vous absent de l'agenda synchronisé. Voir le
// commentaire de la migration 012 : sert uniquement à préparer un brief, pas
// d'écriture dans un vrai agenda ni de bot Recall.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: {
    title?: string;
    companyName?: string;
    contactEmail?: string;
    meetingTime?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Le nom du rendez-vous est requis." }, { status: 400 });
  }
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "Le nom de l'entreprise est requis." }, { status: 400 });
  }
  const meetingTime = body.meetingTime ? new Date(body.meetingTime) : null;
  if (!meetingTime || Number.isNaN(meetingTime.getTime())) {
    return NextResponse.json({ error: "Date ou heure invalide." }, { status: 400 });
  }

  try {
    const meeting = await createManualMeeting(auth.userId, {
      title: body.title,
      companyName: body.companyName,
      contactEmail: body.contactEmail,
      meetingTime: meetingTime.toISOString(),
    });

    // Renvoyé directement au format CalendarEvent attendu par la liste
    // côté client (mêmes clés que les événements Google/Microsoft), plus
    // `manual`/`company` qui distinguent ce RDV pour la préparation du brief
    // (pas de devinette de société depuis un domaine email) et la suppression.
    const event = {
      id: meeting.id,
      summary: meeting.title,
      company: meeting.companyName,
      manual: true,
      start: { dateTime: meeting.meetingTime },
      end: { dateTime: new Date(new Date(meeting.meetingTime).getTime() + 60 * 60000).toISOString() },
      attendees: meeting.contactEmail ? [{ email: meeting.contactEmail }] : [],
    };
    return NextResponse.json({ event });
  } catch (err) {
    console.error("[calendar/manual-events] createManualMeeting failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création du rendez-vous." }, { status: 500 });
  }
}
