// Lecture des participants d'un événement d'agenda renvoyé par Recall.
//
// Recall place dans `raw` l'événement TEL QUE L'AGENDA LE FOURNIT, sans le
// normaliser (vérifié le 28/09/2026 sur un vrai événement) : format Google
// Calendar pour un agenda Google, format Microsoft Graph pour un agenda
// Outlook. Les deux n'ont presque rien en commun :
//
//   Google : attendees[] = { email, responseStatus, self?, resource? }
//            l'organisateur figure dans attendees.
//   Graph  : attendees[] = { emailAddress: { address, name }, status: { response }, type }
//            l'organisateur est À PART (organizer.emailAddress) et n'est pas
//            garanti dans attendees ; la réponse du propriétaire de l'agenda
//            est portée par l'événement lui-même (responseStatus.response,
//            isOrganizer), pas par sa ligne dans attendees.
//
// Jusqu'au 28/09/2026 seul le format Google était lu : sur un événement
// Outlook, l'utilisateur n'était jamais trouvé parmi les participants et
// CHAQUE réunion était écartée (« user not accepted: not found ») — aucun bot
// n'aurait jamais rejoint une réunion Teams.
//
// Aucune dépendance : testé directement (tests/calendar-participants.test.ts).

export type EventParticipants = {
  // Adresses des participants humains (salles et ressources exclues), en
  // minuscules, sans doublon. Ordre : invités d'abord, organisateur ensuite.
  emails: string[];
  // Réponse du propriétaire de l'agenda : « accepted » quand il a accepté ou
  // qu'il organise, sinon la valeur brute de l'agenda ; null quand il
  // n'apparaît nulle part.
  userResponse: string | null;
};

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isGraphEvent(raw: Obj, platform: string | null | undefined): boolean {
  if (platform === "microsoft_outlook") return true;
  if (platform === "google_calendar") return false;
  // Plateforme absente : on reconnaît le format à sa forme.
  if (asObj(asObj(raw.organizer)?.emailAddress)) return true;
  const attendees = Array.isArray(raw.attendees) ? raw.attendees : [];
  return attendees.some((a) => asObj(asObj(a)?.emailAddress) !== null);
}

function readGoogle(raw: Obj, userEmail: string): EventParticipants {
  const emails: string[] = [];
  let userResponse: string | null = null;

  for (const item of Array.isArray(raw.attendees) ? raw.attendees : []) {
    const a = asObj(item);
    const email = str(a?.email)?.toLowerCase();
    if (!a || !email || a.resource === true) continue;
    if (!emails.includes(email)) emails.push(email);
    if (a.self === true || email === userEmail) {
      userResponse = str(a.responseStatus);
    }
  }

  return { emails, userResponse };
}

function readGraph(raw: Obj, userEmail: string): EventParticipants {
  const emails: string[] = [];
  let userLineResponse: string | null = null;

  for (const item of Array.isArray(raw.attendees) ? raw.attendees : []) {
    const a = asObj(item);
    const email = str(asObj(a?.emailAddress)?.address)?.toLowerCase();
    if (!a || !email || a.type === "resource") continue;
    if (!emails.includes(email)) emails.push(email);
    if (email === userEmail) userLineResponse = str(asObj(a.status)?.response);
  }

  // Quand le prospect a envoyé l'invitation, c'est LUI l'organisateur — et il
  // peut ne pas figurer dans attendees. L'oublier ferait passer la réunion
  // pour interne.
  const organizer = str(asObj(asObj(raw.organizer)?.emailAddress)?.address)?.toLowerCase();
  if (organizer && !emails.includes(organizer)) emails.push(organizer);

  // Le point de vue du propriétaire de l'agenda fait foi : il ne dépend pas
  // de l'adresse (un alias, une adresse principale différente de celle de
  // connexion ne le trompent pas). La ligne dans attendees n'est qu'un repli.
  let userResponse: string | null;
  if (raw.isOrganizer === true) {
    userResponse = "organizer";
  } else {
    userResponse = str(asObj(raw.responseStatus)?.response);
    if (!userResponse || userResponse === "none") userResponse = userLineResponse ?? userResponse;
    if (!userResponse && organizer === userEmail) userResponse = "organizer";
  }

  // Graph dit « organizer » là où Google dit « accepted » pour l'organisateur :
  // les deux signifient que la réunion est la sienne.
  if (userResponse === "organizer") userResponse = "accepted";

  return { emails, userResponse };
}

export function readEventParticipants(
  raw: unknown,
  userEmail: string,
  platform?: string | null
): EventParticipants {
  const event = asObj(raw);
  if (!event) return { emails: [], userResponse: null };
  const me = userEmail.trim().toLowerCase();
  return isGraphEvent(event, platform) ? readGraph(event, me) : readGoogle(event, me);
}

export function emailDomain(email: string): string {
  return (email.split("@")[1] ?? "").toLowerCase();
}
