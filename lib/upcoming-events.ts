import type { Session } from "next-auth";
import { getUpcomingMeetings, type CalendarEvent } from "@/lib/calendar";
import { listUpcomingManualMeetingsForUser } from "@/lib/db";

// Les rendez-vous des 7 prochains jours : agenda Google/Microsoft + RDV
// ajoutés à la main, triés ensemble. Partagé par GET /api/calendar/events et
// par la page /brief, qui les lit côté serveur pour s'afficher déjà remplie —
// sans écran gris le temps que le navigateur aille les chercher (retour de
// Jean, 14/10/2026).
export type UpcomingEvent = CalendarEvent & { manual?: true; company?: string; contactName?: string };
export type UpcomingEventsResult = { ok: true; events: UpcomingEvent[] } | { ok: false; status: number; error: string };

function eventStart(e: CalendarEvent): number {
  return new Date(e.start.dateTime ?? e.start.date ?? 0).getTime();
}

// Sans jeton d'agenda (compte créé par email, sans Google ni Outlook), seuls
// les RDV ajoutés à la main sont lus — pas d'erreur.
export async function loadUpcomingEvents(session: Session, userId: string): Promise<UpcomingEventsResult> {
  const auth = { userId };
  const provider = session.provider ?? "google";
  const userEmail = session.user?.email ?? "";

  // Les RDV ajoutés manuellement (migration 012) appartiennent à Brief, pas à
  // Google/Microsoft — un échec de leur lecture (table absente si la
  // migration n'est pas encore passée en prod) ne doit pas faire tomber tout
  // le calendrier, et inversement.
  //
  // Les deux lectures partent ensemble : l'agenda Google/Microsoft est le
  // plus lent, inutile de le faire attendre derrière la base.
  const accessToken = session.accessToken;
  const calendarPromise = (accessToken ? getUpcomingMeetings(accessToken, provider, userEmail) : Promise.resolve([] as CalendarEvent[])).then(
    (events) => ({ ok: true as const, events }),
    (err: unknown) => ({ ok: false as const, err })
  );
  const manualMeetings = await listUpcomingManualMeetingsForUser(auth.userId).catch((err) => {
    console.error("[calendar/events] listUpcomingManualMeetingsForUser failed:", err);
    return [];
  });
  const manualEvents: Array<
    CalendarEvent & { manual: true; company: string; contactName?: string }
  > = manualMeetings.map((m) => ({
    id: m.id,
    summary: m.title,
    company: m.companyName,
    manual: true,
    start: { dateTime: m.meetingTime },
    end: { dateTime: new Date(new Date(m.meetingTime).getTime() + 60 * 60000).toISOString() },
    attendees: m.contactEmail
      ? [{ email: m.contactEmail, name: m.contactName ?? undefined }]
      : [],
    // `attendees` exige une adresse : le nom seul, qui suffit pourtant à
    // l'annuaire (nom + entreprise), n'y tiendrait pas. Il voyage donc à part.
    contactName: m.contactName ?? undefined,
  }));

  const calendar = await calendarPromise;
  if (calendar.ok) {
    const merged = [...calendar.events, ...manualEvents].sort((a, b) => eventStart(a) - eventStart(b));
    return { ok: true, events: merged };
  }
  const err = calendar.err;
  // Le calendrier réel a échoué (token expiré, scope manquant...) : montrer
  // au moins les RDV manuels plutôt que de tout perdre derrière une erreur
  // qui ne les concerne pas.
  if (manualEvents.length > 0) {
    return { ok: true, events: manualEvents };
  }
  const message = err instanceof Error ? err.message : "Erreur calendrier";
  // Accès expiré ou révoqué chez Google / Microsoft : le message brut de
  // l'API (en anglais, avec un lien développeur) n'aide pas l'utilisateur.
  const authExpired = /invalid authentication credentials|invalid_grant|unauthenticated|\b401\b|InvalidAuthenticationToken/i.test(message);
  return {
    ok: false,
    status: authExpired ? 401 : 500,
    error: authExpired
        ? "Votre connexion à votre agenda a expiré. Reconnectez-vous pour afficher vos prochains rendez-vous."
        : "Impossible de charger vos rendez-vous pour le moment. Réessayez dans quelques minutes.",
  };
}
