import { getRecallCalendarId, getCrmTokens, getEnabledModulesForUser, getOrganizationHubspotAutofill, getOrganizationMicrosoftConsent, isDealMemoryEnabledForOrganization, isHubspotAutoPushEnabled } from "@/lib/db";
import { getEffectiveUserId, getViewer } from "@/lib/session-user";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { APP_URL } from "@/lib/app-url";
import {
  buildAdminConsentUrl,
  coerceMicrosoftAdminConsent,
  consentMailto,
  resolveMicrosoftTenant,
  signConsentState,
} from "@/lib/microsoft-admin-consent";
import { coerceAutofillConfig } from "@/lib/hubspot-autofill";
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
  const [recallCalendarId, calendarWriteAccess, slackConnected, pipedriveTokens, hubspotTokens, viewer, session] = userId
    ? await Promise.all([
        getRecallCalendarId(userId),
        hasCalendarWriteAccess(userId),
        hasSlackConnection(userId),
        getCrmTokens(userId, "pipedrive"),
        getCrmTokens(userId, "hubspot"),
        // Lu une fois pour tout l'écran (il l'était à part, en séquence, pour
        // la seule carte HubSpot) : rôle et organisation servent aussi à la
        // carte Microsoft 365.
        getViewer(),
        getServerSession(authOptions),
      ])
    : [null, false, false, null, null, null, null];

  // État réel chez Recall, lu en direct : un identifiant enregistré ne prouve
  // pas que l'agenda fonctionne (un commercial est resté deux mois « connecté »
  // avec un jeton expiré). Null si Recall ne répond pas — on affiche alors
  // « connecté », comme avant, plutôt qu'une fausse alerte.
  const calendarHealth = recallCalendarId ? await getRecallCalendarHealth(recallCalendarId) : null;
  // Cartes CRM et Slack : seulement si le module est ouvert (parcours client).
  const modules = userId ? await getEnabledModulesForUser(userId) : [];

  const isManager = !!viewer && viewer.role === "manager" && !!viewer.organizationId;

  // Mise à jour automatique des propriétés HubSpot : managers des
  // organisations où la fiche deal est active.
  const autofillAvailable =
    modules.includes("crm") &&
    hubspotTokens !== null &&
    isManager &&
    (await isDealMemoryEnabledForOrganization(viewer!.organizationId!));
  const autofillActive =
    autofillAvailable && (coerceAutofillConfig(await getOrganizationHubspotAutofill(viewer!.organizationId!))?.active ?? false);
  // Écriture dans le HubSpot du client : un choix, jamais un défaut
  // (migration 046). Sans lui, Brief lit le CRM et n'y touche pas.
  const hubspotAutoPush = autofillAvailable ? await isHubspotAutoPushEnabled(viewer!.organizationId!) : false;

  // Consentement administrateur Microsoft (lib/microsoft-admin-consent.ts) :
  // sans lui, aucun salarié d'un client en Microsoft 365 ne peut se
  // connecter. La carte n'est montrée qu'au manager — l'accord engage toute
  // l'organisation.
  const microsoftConsent = isManager
    ? coerceMicrosoftAdminConsent(await getOrganizationMicrosoftConsent(viewer!.organizationId!))
    : null;
  const azureClientId = process.env.AZURE_AD_CLIENT_ID;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  let microsoftConsentLink: string | null = null;
  if (isManager && !microsoftConsent && azureClientId && nextAuthSecret) {
    // Un appel réseau à Microsoft, uniquement tant que l'accord manque :
    // connaître le tenant épargne à l'administrateur le choix de son
    // organisation. Il rend null sans bruit (domaine grand public, hors
    // Microsoft 365, ou Microsoft muet) et « organizations » prend le relais.
    const domain = session?.user?.email?.split("@")[1] ?? "";
    const tenant = domain ? await resolveMicrosoftTenant(domain) : null;
    microsoftConsentLink = buildAdminConsentUrl({
      clientId: azureClientId,
      tenant,
      redirectUri: `${APP_URL}/api/microsoft/admin-consent/callback`,
      state: signConsentState({ organizationId: viewer!.organizationId! }, nextAuthSecret),
    });
  }

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
        crmEnabled={modules.includes("crm")}
        microsoftCardVisible={isManager}
        microsoftConsent={microsoftConsent}
        microsoftConsentLink={microsoftConsentLink}
        microsoftConsentMailto={
          microsoftConsentLink
            ? consentMailto({ link: microsoftConsentLink, senderName: session?.user?.name ?? null })
            : null
        }
      />
      {modules.includes("crm") && (
        <div className="mt-6">
          <CrmSection pipedriveConnected={pipedriveTokens !== null} hubspotConnected={hubspotTokens !== null} autofillAvailable={autofillAvailable} autofillActive={autofillActive} hubspotAutoPush={hubspotAutoPush} />
        </div>
      )}
    </>
  );
}
