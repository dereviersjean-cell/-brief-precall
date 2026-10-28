import type { Session } from "next-auth";
import { getUpcomingMeetings, type CalendarEvent } from "@/lib/calendar";
import {
  getDealRankIndex,
  getGoogleTokens,
  getOrganizationEmailDomains,
  getOrganizationForUser,
  getUserEmail,
  isDealMemoryEnabledForOrganization,
  listUpcomingManualMeetingsForUser,
  saveGoogleTokens,
} from "@/lib/db";
import { dealIdentityFor } from "@/lib/deal-grouping";
import { getImpersonationTarget } from "@/lib/impersonation";
import { refreshGoogleAccessTokenOnce } from "@/lib/gmail";

// Exception unique et volontaire (demande de Jean du 27/10/2026, avec
// l'accord de Hubert de la Lance, associé d'Oliverlist et non client, pour
// tester Brief ensemble) : quand un admin imite CE compte, la liste des
// rendez-vous est lue dans l'agenda Google de la personne imitée, avec ses
// accès enregistrés. Pour tout autre compte, l'imitation continue d'afficher
// l'agenda de la personne réellement connectée : les règles Google acceptées
// à la vérification interdisent de montrer les données Google d'un
// utilisateur à quelqu'un d'autre. Ne pas élargir cette liste sans accord
// écrit de la personne concernée.
const IMPERSONATION_CALENDAR_USERS = new Set(["39addb01-3110-4c96-ad24-2b22904bcd68"]);

// L'agenda Google de la personne imitée, si elle figure dans la liste
// ci-dessus ; null sinon (on garde alors la connexion du navigateur).
async function impersonatedGoogleAccess(userId: string): Promise<{ accessToken: string; email: string } | null> {
  if (!IMPERSONATION_CALENDAR_USERS.has(userId)) return null;
  const target = await getImpersonationTarget().catch(() => null);
  if (target?.id !== userId) return null;
  const [tokens, email] = await Promise.all([getGoogleTokens(userId), getUserEmail(userId)]);
  if (!email) return null;
  const fresh = tokens.accessToken && tokens.expiresAt && Date.parse(tokens.expiresAt) - Date.now() > 60_000;
  if (fresh) return { accessToken: tokens.accessToken!, email };
  if (!tokens.refreshToken) return null;
  const accessToken = await refreshGoogleAccessTokenOnce(tokens.refreshToken);
  await saveGoogleTokens(userId, accessToken, undefined, new Date(Date.now() + 3600 * 1000).toISOString()).catch(() => {});
  return { accessToken, email };
}

// Les rendez-vous des 7 prochains jours : agenda Google/Microsoft + RDV
// ajoutés à la main, triés ensemble. Partagé par GET /api/calendar/events et
// par la page /brief, qui les lit côté serveur pour s'afficher déjà remplie —
// sans écran gris le temps que le navigateur aille les chercher (retour de
// Jean, 14/10/2026).
export type UpcomingEvent = CalendarEvent & {
  manual?: true;
  company?: string;
  contactName?: string;
  // Rang du rendez-vous dans le deal du prospect (R1 = premier call), et le
  // deal quand il existe. Absent hors des organisations en test, ou sans
  // repère sur le prospect.
  dealRank?: number;
  dealName?: string;
};

// Un deal dont le nom commence par le même mot distinctif (« peatch » pour
// « peatch ai »), seulement s'il est le seul : même règle que le brief
// (findDealByNamePrefix, 28/10/2026).
function nearName<T extends { nameKey: string | null }>(deals: T[], nameKey: string): T | undefined {
  const word = nameKey.split(" ")[0];
  if (!word || word.length < 4) return undefined;
  const matches = deals.filter((d) => d.nameKey === word || d.nameKey?.startsWith(`${word} `));
  return matches.length === 1 ? matches[0] : undefined;
}

// Chaque rendez-vous reçoit son rang : le deal du prospect est cherché par le
// domaine de l'invité ou l'entreprise saisie (mêmes repères que le
// rattachement d'un call), et son nombre de calls donne le rang du suivant.
async function withDealRanks(userId: string, events: UpcomingEvent[]): Promise<UpcomingEvent[]> {
  const org = await getOrganizationForUser(userId).catch(() => null);
  if (!org || !(await isDealMemoryEnabledForOrganization(org.id))) return events;
  const [index, ownDomains] = await Promise.all([getDealRankIndex(org.id), getOrganizationEmailDomains(org.id)]);
  return events.map((event) => {
    const identity = dealIdentityFor({
      contactEmail: event.attendees[0]?.email ?? null,
      prospectCompany: null,
      companyName: event.company ?? null,
      ownDomains,
      ownCompanyName: org.name ?? null,
    });
    if (!identity) return event;
    const deal =
      (identity.domain ? index.deals.find((d) => d.domain === identity.domain) : undefined) ??
      (identity.nameKey ? index.deals.find((d) => d.nameKey === identity.nameKey) : undefined) ??
      (identity.nameKey ? nearName(index.deals, identity.nameKey) : undefined);
    const calls = deal ? index.calls[deal.id] ?? 0 : 0;
    return calls > 0 ? { ...event, dealRank: calls + 1, dealName: deal!.name } : { ...event, dealRank: 1 };
  });
}
export type UpcomingEventsResult = { ok: true; events: UpcomingEvent[] } | { ok: false; status: number; error: string };

function eventStart(e: CalendarEvent): number {
  return new Date(e.start.dateTime ?? e.start.date ?? 0).getTime();
}

// Sans jeton d'agenda (compte créé par email, sans Google ni Outlook), seuls
// les RDV ajoutés à la main sont lus — pas d'erreur.
export async function loadUpcomingEvents(session: Session, userId: string): Promise<UpcomingEventsResult> {
  const auth = { userId };
  const impersonated = await impersonatedGoogleAccess(userId).catch((err) => {
    console.error("[calendar/events] impersonatedGoogleAccess failed:", err instanceof Error ? err.message : String(err));
    return null;
  });
  const provider = impersonated ? "google" : session.provider ?? "google";
  const userEmail = impersonated?.email ?? session.user?.email ?? "";

  // Les RDV ajoutés manuellement (migration 012) appartiennent à Brief, pas à
  // Google/Microsoft — un échec de leur lecture (table absente si la
  // migration n'est pas encore passée en prod) ne doit pas faire tomber tout
  // le calendrier, et inversement.
  //
  // Les deux lectures partent ensemble : l'agenda Google/Microsoft est le
  // plus lent, inutile de le faire attendre derrière la base.
  const accessToken = impersonated?.accessToken ?? session.accessToken;
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
    return { ok: true, events: await withDealRanks(userId, merged).catch(() => merged) };
  }
  const err = calendar.err;
  // Le calendrier réel a échoué (token expiré, scope manquant...) : montrer
  // au moins les RDV manuels plutôt que de tout perdre derrière une erreur
  // qui ne les concerne pas.
  if (manualEvents.length > 0) {
    return { ok: true, events: await withDealRanks(userId, manualEvents).catch(() => manualEvents) };
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
