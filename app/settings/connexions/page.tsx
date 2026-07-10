import { getRecallCalendarId } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import ConnexionsSettingsClient from "./ConnexionsSettingsClient";

export default async function ConnexionsSettingsPage() {
  const userId = await getEffectiveUserId();
  const recallCalendarId = userId ? await getRecallCalendarId(userId) : null;

  return <ConnexionsSettingsClient recallConnected={recallCalendarId !== null} />;
}
