import { getRecallCalendarId } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasCalendarWriteAccess } from "@/lib/google-calendar";
import { hasSlackConnection } from "@/lib/slack";
import ConnexionsSettingsClient from "./ConnexionsSettingsClient";

export default async function ConnexionsSettingsPage() {
  const userId = await getEffectiveUserId();
  const [recallCalendarId, calendarWriteAccess, slackConnected] = userId
    ? await Promise.all([getRecallCalendarId(userId), hasCalendarWriteAccess(userId), hasSlackConnection(userId)])
    : [null, false, false];

  return (
    <ConnexionsSettingsClient
      recallConnected={recallCalendarId !== null}
      hasCalendarWriteAccess={calendarWriteAccess}
      slackConnected={slackConnected}
    />
  );
}
