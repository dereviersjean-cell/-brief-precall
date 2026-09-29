import { getRecallCalendarId, getCrmTokens, getEnabledModulesForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { hasCalendarWriteAccess } from "@/lib/google-calendar";
import { hasSlackConnection } from "@/lib/slack";
import { getRecallCalendarHealth } from "@/lib/recall";
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

  // État réel chez Recall, lu en direct : un identifiant enregistré ne prouve
  // pas que l'agenda fonctionne (un commercial est resté deux mois « connecté »
  // avec un jeton expiré). Null si Recall ne répond pas — on affiche alors
  // « connecté », comme avant, plutôt qu'une fausse alerte.
  const calendarHealth = recallCalendarId ? await getRecallCalendarHealth(recallCalendarId) : null;
  // Cartes CRM et Slack : seulement si le module est ouvert (parcours client).
  const modules = userId ? await getEnabledModulesForUser(userId) : [];

  return (
    <>
      <ConnexionsSettingsClient
        recallConnected={recallCalendarId !== null}
        recallDisconnected={calendarHealth?.status === "disconnected"}
        recallDisconnectedSince={calendarHealth?.status === "disconnected" ? calendarHealth.since : null}
        recallPlatform={calendarHealth?.platform ?? null}
        hasCalendarWriteAccess={calendarWriteAccess}
        slackConnected={slackConnected}
        slackEnabled={modules.includes("slack")}
      />
      {modules.includes("crm") && (
        <div className="mt-6">
          <CrmSection pipedriveConnected={pipedriveTokens !== null} hubspotConnected={hubspotTokens !== null} />
        </div>
      )}
    </>
  );
}
