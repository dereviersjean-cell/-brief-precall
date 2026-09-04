import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUpcomingMeetings, CalendarEvent } from "@/lib/calendar";
import { listUpcomingManualMeetingsForUser } from "@/lib/db";

function eventStart(e: CalendarEvent): number {
  return new Date(e.start.dateTime ?? e.start.date ?? 0).getTime();
}

export async function GET() {
  const session = await getServerSession(authOptions);

  // `requireActiveUser` et pas seulement la présence d'une session : c'est lui
  // qui applique `disabled_at` et le blocage de facturation. Le middleware ne
  // couvre que des pages, jamais /api — cette route gardait donc un compte
  // désactivé ou une organisation suspendue en état de marche.
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const provider = session.provider ?? "google";
  const userEmail = session.user?.email ?? "";

  // Les RDV ajoutés manuellement (migration 012) appartiennent à Brief, pas à
  // Google/Microsoft — un échec de leur lecture (table absente si la
  // migration n'est pas encore passée en prod) ne doit pas faire tomber tout
  // le calendrier, et inversement.
  const manualMeetings = await listUpcomingManualMeetingsForUser(auth.userId).catch((err) => {
    console.error("[calendar/events] listUpcomingManualMeetingsForUser failed:", err);
    return [];
  });
  const manualEvents: Array<CalendarEvent & { manual: true; company: string }> = manualMeetings.map((m) => ({
    id: m.id,
    summary: m.title,
    company: m.companyName,
    manual: true,
    start: { dateTime: m.meetingTime },
    end: { dateTime: new Date(new Date(m.meetingTime).getTime() + 60 * 60000).toISOString() },
    attendees: m.contactEmail
      ? [{ email: m.contactEmail, name: m.contactName ?? undefined }]
      : [],
  }));

  try {
    const events = await getUpcomingMeetings(session.accessToken, provider, userEmail);
    const merged = [...events, ...manualEvents].sort((a, b) => eventStart(a) - eventStart(b));
    return NextResponse.json(merged);
  } catch (err) {
    // Le calendrier réel a échoué (token expiré, scope manquant...) : montrer
    // au moins les RDV manuels plutôt que de tout perdre derrière une erreur
    // qui ne les concerne pas.
    if (manualEvents.length > 0) {
      return NextResponse.json(manualEvents);
    }
    const message = err instanceof Error ? err.message : "Erreur calendrier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
