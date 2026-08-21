import { getRecallCalendarId, getCrmTokens } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasCalendarWriteAccess } from "@/lib/google-calendar";
import { hasSlackConnection } from "@/lib/slack";
import ConnexionsSettingsClient from "./ConnexionsSettingsClient";
import CrmSection from "./CrmSection";

export default async function ConnexionsSettingsPage() {
  const userId = await getEffectiveUserId();
  // Tout en parallèle : ces cinq lectures sont indépendantes, les enchaîner
  // ajouterait autant d'allers-retours à une page déjà servie par une
  // fonction qui démarre à froid.
  const [recallCalendarId, calendarWriteAccess, slackConnected, pipedriveTokens, hubspotTokens] = userId
    ? await Promise.all([
        getRecallCalendarId(userId),
        hasCalendarWriteAccess(userId),
        hasSlackConnection(userId),
        getCrmTokens(userId, "pipedrive"),
        getCrmTokens(userId, "hubspot"),
      ])
    : [null, false, false, null, null];

  return (
    <>
      <ConnexionsSettingsClient
        recallConnected={recallCalendarId !== null}
        hasCalendarWriteAccess={calendarWriteAccess}
        slackConnected={slackConnected}
      />
      <div className="mt-6">
        <CrmSection pipedriveConnected={pipedriveTokens !== null} hubspotConnected={hubspotTokens !== null} />
      </div>
    </>
  );
}
