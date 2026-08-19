import { getEffectiveChannelsForUser, getUserName, getUserEmail } from "./db";
import { sendBriefPreCallEmail, sendCallAnalysisEmail } from "./email";
import { appendBriefToCalendarEvent, hasCalendarWriteAccess } from "./google-calendar";
import { formatBriefAsMarkdown, type GeneratedBriefJson } from "./brief-generator";
import { hasHubSpotWriteAccess, htmlBodyForHubSpot, writeToHubSpotCascade } from "./crm/hubspot";
import { hasPipedriveWriteAccess, htmlBodyForPipedrive, writeToPipedriveCascade } from "./crm/pipedrive";
import { hasSlackConnection, mrkdwnMessageForSlack, writeToSlackDM } from "./slack";
import { APP_URL } from "@/lib/app-url";

// Single entry point per event type (module Distribution Flexible,
// sous-étape B) — reads the user's own notification_preferences and
// dispatches only to the channels they've enabled. Both functions:
//  - resolve userId's own name/email internally (the recipient of these
//    notifications is always the commercial themselves, not the prospect —
//    "reçu vos briefs pré-call" in the settings page copy), so callers only
//    need to pass event-specific content/context, not user identity.
//  - never throw: every channel attempt is individually caught, and the
//    per-channel outcome is returned as "sent" or "error: <message>" for the
//    caller to log. A failed send must never fail the request that
//    triggered it (brief generation, the Recall webhook).

export type BriefDispatchMeetingContext = {
  calendarEventId: string | null;
  meetingTitle: string;
  meetingStartsAt: string | null;
  contactName: string | null;
  contactEmail: string | null;
};

export type BriefDispatchResult = {
  email: string | null;
  calendar: string | null;
  hubspot: string | null;
  pipedrive: string | null;
  slack: string | null;
};

export async function dispatchBriefPreCall(
  userId: string,
  brief: GeneratedBriefJson,
  meetingContext: BriefDispatchMeetingContext
): Promise<BriefDispatchResult> {
  const results: BriefDispatchResult = { email: null, calendar: null, hubspot: null, pipedrive: null, slack: null };

  const channels = await getEffectiveChannelsForUser(userId, "brief_precall");
  if (channels.length === 0) return results;

  const briefMarkdown = formatBriefAsMarkdown(brief);
  const briefUrl = `${APP_URL}/brief/${encodeURIComponent(meetingContext.calendarEventId ?? "")}?company=${encodeURIComponent(
    meetingContext.meetingTitle
  )}`;

  if (channels.includes("email")) {
    try {
      const userEmail = await getUserEmail(userId);
      if (!userEmail) throw new Error("Aucun email pour ce user.");
      const userName = await getUserName(userId);
      await sendBriefPreCallEmail({
        to: userEmail,
        userName,
        meetingTitle: meetingContext.meetingTitle,
        meetingStartsAt: meetingContext.meetingStartsAt,
        contactName: meetingContext.contactName,
        contactEmail: meetingContext.contactEmail,
        briefContent: briefMarkdown,
        briefUrl,
      });
      results.email = "sent";
    } catch (err) {
      results.email = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (channels.includes("calendar")) {
    if (!meetingContext.calendarEventId) {
      results.calendar = "error: no calendarEventId for this meeting";
    } else if (!(await hasCalendarWriteAccess(userId))) {
      // Expected, handled state — not a failure. The user's stored Google
      // token predates the calendar.events scope upgrade (lib/auth.ts); the
      // fix is them reconnecting, not retrying, so this skips the attempt
      // entirely instead of letting it hit Google and log a 403.
      console.warn(
        `[dispatchBriefPreCall] Utilisateur ${userId} a activé le canal calendar mais n'a pas le scope calendar.events — brief non ajouté à l'événement. Attend reconnexion.`
      );
      results.calendar = "skipped: calendar.events scope missing, user must reconnect Google";
    } else {
      try {
        await appendBriefToCalendarEvent(userId, meetingContext.calendarEventId, briefMarkdown, briefUrl);
        results.calendar = "sent";
      } catch (err) {
        results.calendar = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  if (channels.includes("hubspot")) {
    if (!meetingContext.contactEmail) {
      results.hubspot = "error: no contactEmail for this meeting";
    } else if (!(await hasHubSpotWriteAccess(userId))) {
      // Same "expected, handled state" pattern as the calendar branch above —
      // existing HubSpot connections predate the contacts.write/deals.write
      // scopes (lib/crm/hubspot.ts SCOPES), the fix is reconnecting, not
      // retrying.
      console.warn(
        `[dispatchBriefPreCall] Utilisateur ${userId} a activé le canal hubspot mais n'a pas le scope crm.objects.contacts.write — brief non écrit dans HubSpot. Attend reconnexion.`
      );
      results.hubspot = "skipped: crm.objects.contacts.write scope missing, user must reconnect HubSpot";
    } else {
      try {
        const htmlBody = htmlBodyForHubSpot({
          markdown: briefMarkdown,
          linkUrl: briefUrl,
          linkLabel: "Voir dans Brief",
        });
        const cascadeResult = await writeToHubSpotCascade(
          userId,
          meetingContext.contactEmail,
          htmlBody,
          meetingContext.calendarEventId ?? meetingContext.contactEmail,
          meetingContext.meetingStartsAt ?? undefined
        );
        results.hubspot =
          cascadeResult.target === "none"
            ? "skipped: no matching meeting/deal/contact found in HubSpot"
            : `sent: ${cascadeResult.target}${cascadeResult.id ? ` (${cascadeResult.id})` : ""}`;
      } catch (err) {
        results.hubspot = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  if (channels.includes("pipedrive")) {
    if (!meetingContext.contactEmail) {
      results.pipedrive = "error: no contactEmail for this meeting";
    } else if (!(await hasPipedriveWriteAccess(userId))) {
      // Same "expected, handled state" pattern as the hubspot branch above —
      // existing Pipedrive connections predate the deals:full/contacts:full/
      // activities:full scopes (lib/crm/pipedrive.ts), the fix is
      // reconnecting, not retrying.
      console.warn(
        `[dispatchBriefPreCall] Utilisateur ${userId} a activé le canal pipedrive mais n'a pas les scopes d'écriture — brief non écrit dans Pipedrive. Attend reconnexion.`
      );
      results.pipedrive = "skipped: deals:full/contacts:full/activities:full scope missing, user must reconnect Pipedrive";
    } else {
      try {
        const htmlBody = htmlBodyForPipedrive({
          markdown: briefMarkdown,
          linkUrl: briefUrl,
          linkLabel: "Voir dans Brief",
        });
        const cascadeResult = await writeToPipedriveCascade(
          userId,
          meetingContext.contactEmail,
          htmlBody,
          meetingContext.calendarEventId ?? meetingContext.contactEmail,
          meetingContext.meetingStartsAt ?? undefined
        );
        results.pipedrive =
          cascadeResult.target === "none"
            ? "skipped: no matching activity/deal/contact found in Pipedrive"
            : `sent: ${cascadeResult.target}${cascadeResult.id ? ` (${cascadeResult.id})` : ""}`;
      } catch (err) {
        results.pipedrive = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  if (channels.includes("slack")) {
    if (!(await hasSlackConnection(userId))) {
      // Unlike the calendar/hubspot/pipedrive "reconnect" cases, this is
      // usually a first-time connection, not a scope upgrade — the fix is
      // the same either way (send them to connect), so the message stays
      // generic.
      results.slack = "skipped: Slack not connected, user must connect Slack";
    } else {
      try {
        const text = mrkdwnMessageForSlack({ markdown: briefMarkdown, linkUrl: briefUrl, linkLabel: "Voir dans Brief" });
        const dispatchResult = await writeToSlackDM(userId, text);
        results.slack = dispatchResult.target === "none" ? "skipped: Slack not connected" : "sent";
      } catch (err) {
        results.slack = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  return results;
}

export type CallAnalysisDispatchContext = {
  callId: string;
  callTitle: string;
  contactName: string | null;
  contactEmail: string | null;
};

export type CallAnalysisDispatchInput = {
  keyPoints: string | null;
  globalScore: number | null;
  sentiment: string | null;
};

export type CallAnalysisDispatchResult = {
  email: string | null;
  hubspot: string | null;
  pipedrive: string | null;
  slack: string | null;
};

export async function dispatchCallAnalysis(
  userId: string,
  callAnalysis: CallAnalysisDispatchInput,
  callContext: CallAnalysisDispatchContext
): Promise<CallAnalysisDispatchResult> {
  const results: CallAnalysisDispatchResult = { email: null, hubspot: null, pipedrive: null, slack: null };

  const channels = await getEffectiveChannelsForUser(userId, "analyse_postcall");
  if (channels.length === 0) return results;

  const analysisUrl = `${APP_URL}/feedback/${callContext.callId}`;

  if (channels.includes("email")) {
    try {
      const userEmail = await getUserEmail(userId);
      if (!userEmail) throw new Error("Aucun email pour ce user.");
      const userName = await getUserName(userId);
      await sendCallAnalysisEmail({
        to: userEmail,
        userName,
        callTitle: callContext.callTitle,
        contactName: callContext.contactName,
        keyPoints: callAnalysis.keyPoints,
        globalScore: callAnalysis.globalScore,
        sentiment: callAnalysis.sentiment,
        analysisUrl,
      });
      results.email = "sent";
    } catch (err) {
      results.email = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  if (channels.includes("hubspot")) {
    if (!callContext.contactEmail) {
      results.hubspot = "error: no contactEmail for this call";
    } else if (!callAnalysis.keyPoints) {
      results.hubspot = "skipped: no keyPoints generated for this call";
    } else if (!(await hasHubSpotWriteAccess(userId))) {
      console.warn(
        `[dispatchCallAnalysis] Utilisateur ${userId} a activé le canal hubspot mais n'a pas le scope crm.objects.contacts.write — analyse non écrite dans HubSpot. Attend reconnexion.`
      );
      results.hubspot = "skipped: crm.objects.contacts.write scope missing, user must reconnect HubSpot";
    } else {
      try {
        const htmlBody = htmlBodyForHubSpot({
          markdown: callAnalysis.keyPoints,
          linkUrl: analysisUrl,
          linkLabel: "Voir l'analyse dans Brief",
        });
        const cascadeResult = await writeToHubSpotCascade(userId, callContext.contactEmail, htmlBody, callContext.callId);
        results.hubspot =
          cascadeResult.target === "none"
            ? "skipped: no matching meeting/deal/contact found in HubSpot"
            : `sent: ${cascadeResult.target}${cascadeResult.id ? ` (${cascadeResult.id})` : ""}`;
      } catch (err) {
        results.hubspot = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  if (channels.includes("pipedrive")) {
    if (!callContext.contactEmail) {
      results.pipedrive = "error: no contactEmail for this call";
    } else if (!callAnalysis.keyPoints) {
      results.pipedrive = "skipped: no keyPoints generated for this call";
    } else if (!(await hasPipedriveWriteAccess(userId))) {
      console.warn(
        `[dispatchCallAnalysis] Utilisateur ${userId} a activé le canal pipedrive mais n'a pas les scopes d'écriture — analyse non écrite dans Pipedrive. Attend reconnexion.`
      );
      results.pipedrive = "skipped: deals:full/contacts:full/activities:full scope missing, user must reconnect Pipedrive";
    } else {
      try {
        const htmlBody = htmlBodyForPipedrive({
          markdown: callAnalysis.keyPoints,
          linkUrl: analysisUrl,
          linkLabel: "Voir l'analyse dans Brief",
        });
        const cascadeResult = await writeToPipedriveCascade(userId, callContext.contactEmail, htmlBody, callContext.callId);
        results.pipedrive =
          cascadeResult.target === "none"
            ? "skipped: no matching activity/deal/contact found in Pipedrive"
            : `sent: ${cascadeResult.target}${cascadeResult.id ? ` (${cascadeResult.id})` : ""}`;
      } catch (err) {
        results.pipedrive = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  if (channels.includes("slack")) {
    if (!callAnalysis.keyPoints) {
      results.slack = "skipped: no keyPoints generated for this call";
    } else if (!(await hasSlackConnection(userId))) {
      results.slack = "skipped: Slack not connected, user must connect Slack";
    } else {
      try {
        const text = mrkdwnMessageForSlack({
          markdown: callAnalysis.keyPoints,
          linkUrl: analysisUrl,
          linkLabel: "Voir l'analyse dans Brief",
        });
        const dispatchResult = await writeToSlackDM(userId, text);
        results.slack = dispatchResult.target === "none" ? "skipped: Slack not connected" : "sent";
      } catch (err) {
        results.slack = `error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  return results;
}
