// Les origines possibles d'un rendez-vous (liste validée par Hubert le
// 13/11/2026). Sans dépendance : importé par l'écran et par la route.
export const MEETING_ORIGINS = [
  "Prospection email",
  "Cold call",
  "LinkedIn",
  "Inbound",
  "Recommandation",
  "Salon ou événement",
  "Ancien prospect relancé",
  "Partenaire",
  "Réseau personnel",
  "Ancien client réactivé",
] as const;

export type MeetingContext = { origin?: string; note?: string };

// Ce qui est enregistré dans `briefs.content.meeting_context` : une origine de
// la liste et une phrase courte, rien d'autre.
export function cleanMeetingContext(input: unknown): MeetingContext | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as { origin?: unknown; note?: unknown };
  const origin = typeof raw.origin === "string" && (MEETING_ORIGINS as readonly string[]).includes(raw.origin) ? raw.origin : undefined;
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 400) : "";
  if (!origin && !note) return null;
  return { ...(origin ? { origin } : {}), ...(note ? { note } : {}) };
}
