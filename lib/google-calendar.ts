import { getGoogleTokens } from "./db";
import { refreshGoogleAccessToken } from "./gmail";

// lib/auth.ts's GoogleProvider now requests calendar.events (upgraded from
// calendar.readonly), but that only applies to new sign-ins — every user who
// logged in before the upgrade has a refresh_token still scoped to
// calendar.readonly, since a code change doesn't retroactively upgrade a
// token already issued by Google. hasCalendarWriteAccess below lets callers
// check, per user, whether they've actually re-consented yet; until they
// have, appendBriefToCalendarEvent would 403 (confirmed against a real
// token/event) — dispatchBriefPreCall checks first and skips the calendar
// channel cleanly instead of attempting and failing.
export async function hasCalendarWriteAccess(userId: string): Promise<boolean> {
  try {
    const { refreshToken } = await getGoogleTokens(userId);
    if (!refreshToken) return false;

    const accessToken = await refreshGoogleAccessToken(refreshToken);

    const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    if (!res.ok) {
      console.error(`[hasCalendarWriteAccess] tokeninfo request failed (${res.status}) for user ${userId}`);
      return false;
    }
    const data = (await res.json()) as { scope?: string };
    const scopes = (data.scope ?? "").split(" ");
    return (
      scopes.includes("https://www.googleapis.com/auth/calendar.events") ||
      scopes.includes("https://www.googleapis.com/auth/calendar")
    );
  } catch (err) {
    console.error(`[hasCalendarWriteAccess] failed for user ${userId}:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

const BRIEF_MARKER = "━━━━━━━━━━━━━━━━━━━━━━━━";

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s*/gm, "") // heading markers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/^-{3,}\s*$/gm, "") // hr rules (---)
    .replace(/^[-*]\s+/gm, "• ") // bullets -> plain bullet char
    .replace(/\|/g, " ") // any leftover table pipes
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .trim();
}

function buildBriefSection(briefText: string, briefUrl: string): string {
  return [
    BRIEF_MARKER,
    "📄 Brief pré-call généré par Brief",
    BRIEF_MARKER,
    "",
    briefText,
    "",
    `→ Voir dans Brief : ${briefUrl}`,
  ].join("\n");
}

// Detects a brief section from a previous run (delimited by BRIEF_MARKER)
// and replaces just that slice, rather than appending a second one — makes
// re-generating a brief (or a retried dispatch) idempotent on the calendar
// description instead of stacking duplicates.
function mergeDescription(existingDescription: string, briefSection: string): string {
  const markerIndex = existingDescription.indexOf(BRIEF_MARKER);
  const before = (markerIndex === -1 ? existingDescription : existingDescription.slice(0, markerIndex)).trim();
  return before ? `${before}\n\n${briefSection}` : briefSection;
}

// briefUrl isn't in the brief's own spec'd 3-arg signature
// (userId, calendarEventId, briefContent) but is required to render the
// "→ Voir dans Brief : {briefUrl}" line the spec itself asks for — added as
// a 4th param rather than reconstructing it here (the caller,
// dispatchBriefPreCall, already builds the same URL for the email).
export async function appendBriefToCalendarEvent(
  userId: string,
  calendarEventId: string,
  briefContent: string,
  briefUrl: string
): Promise<void> {
  const { refreshToken } = await getGoogleTokens(userId);
  if (!refreshToken) {
    throw new Error("Google non connecté pour cet utilisateur.");
  }
  const accessToken = await refreshGoogleAccessToken(refreshToken);

  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`;

  const getRes = await fetch(eventUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!getRes.ok) {
    throw new Error(`Google Calendar GET failed (${getRes.status}): ${await getRes.text()}`);
  }
  const event = (await getRes.json()) as { description?: string };

  const briefSection = buildBriefSection(markdownToPlainText(briefContent), briefUrl);
  const newDescription = mergeDescription(event.description ?? "", briefSection);

  const patchRes = await fetch(eventUrl, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ description: newDescription }),
  });
  if (!patchRes.ok) {
    throw new Error(`Google Calendar PATCH failed (${patchRes.status}): ${await patchRes.text()}`);
  }
}
