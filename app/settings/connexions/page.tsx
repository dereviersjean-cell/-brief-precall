import { getRecallCalendarId } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasCalendarWriteAccess } from "@/lib/google-calendar";
import ConnexionsSettingsClient from "./ConnexionsSettingsClient";

export default async function ConnexionsSettingsPage() {
  const userId = await getEffectiveUserId();
  const [recallCalendarId, calendarWriteAccess] = userId
    ? await Promise.all([getRecallCalendarId(userId), hasCalendarWriteAccess(userId)])
    : [null, false];

  return (
    <ConnexionsSettingsClient
      recallConnected={recallCalendarId !== null}
      hasCalendarWriteAccess={calendarWriteAccess}
    />
  );
}
