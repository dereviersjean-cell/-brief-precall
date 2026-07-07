import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getUpcomingScheduledMeetings,
  getUpcomingScheduledMeetingsForUser,
  getSuspiciousRecentCalls,
  getSuspiciousRecentCallsForUser,
  getMissedScheduledMeetings,
  updateCallRecallBotStatus,
  updateScheduledMeetingBotStatus,
} from "@/lib/db";
import { getBotInfo, getBotIdFromCalendarEvent } from "@/lib/recall";

const BOT_STATUS_CACHE_MS = 60 * 60 * 1000;
const MISSED_MEETING_STATUS_CACHE_MS = 15 * 60 * 1000;
const NO_BOT_FOUND_LABEL = "Aucun bot retrouvé pour cet événement";

type BotStatusChange = { code: string; sub_code?: string | null; created_at: string };

const CODE_LABELS: Record<string, string> = {
  joining_call: "Rejoint l'appel",
  in_waiting_room: "En salle d'attente",
  in_call_not_recording: "En appel (pas d'enregistrement)",
  in_call_recording: "Enregistrement en cours",
  call_ended: "Appel terminé",
  recording_done: "Enregistrement terminé",
  done: "Terminé",
  fatal: "Erreur",
};

const SUB_CODE_LABELS: Record<string, string> = {
  bot_not_accepted_by_host: "Refusé par l'hôte",
  timeout_exceeded_everyone_left: "Timeout — tous les participants ont quitté",
  timeout_exceeded_only_bot_in_call: "Timeout — bot seul dans l'appel",
  meeting_not_started: "Réunion jamais démarrée",
};

// Codes/sub_codes above are the ones we've actually observed or that are
// well-documented; anything else falls back to the raw code so we never
// silently misreport a status we haven't verified.
function describeBotStatus(botInfo: Record<string, unknown>): string {
  const changes = (botInfo.status_changes as BotStatusChange[] | null) ?? [];
  const last = changes[changes.length - 1];
  if (!last) return "Statut inconnu";

  if (last.sub_code) {
    return SUB_CODE_LABELS[last.sub_code] ?? `${CODE_LABELS[last.code] ?? last.code} (${last.sub_code})`;
  }
  return CODE_LABELS[last.code] ?? last.code;
}

// Also serves the per-user admin page (?userId=...) — same shape, same 1h
// cache on getBotInfo, just scoped to one user's meetings/calls. Behavior is
// unchanged when userId is absent.
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");

  const [upcomingMeetings, suspiciousCalls, missedMeetings] = await Promise.all([
    userId ? getUpcomingScheduledMeetingsForUser(userId) : getUpcomingScheduledMeetings(),
    userId ? getSuspiciousRecentCallsForUser(userId, 20) : getSuspiciousRecentCalls(20),
    getMissedScheduledMeetings(20, userId),
  ]);

  // Only path in this route that can call the Recall API — capped at the 20
  // calls already enforced by getSuspiciousRecentCalls's limit, and skipped
  // entirely per-call when a status was fetched less than an hour ago.
  const suspiciousWithStatus = await Promise.all(
    suspiciousCalls.map(async (call) => {
      const fetchedAt = call.recall_bot_status_fetched_at ? new Date(call.recall_bot_status_fetched_at).getTime() : null;
      const isFresh = fetchedAt !== null && Date.now() - fetchedAt < BOT_STATUS_CACHE_MS;
      if (isFresh && call.recall_bot_status) {
        return { ...call, botStatus: call.recall_bot_status };
      }

      try {
        const botInfo = await getBotInfo(call.recall_bot_id);
        const botStatus = describeBotStatus(botInfo);
        await updateCallRecallBotStatus(call.id, botStatus);
        return { ...call, botStatus };
      } catch (err) {
        console.error(`[recall-status] getBotInfo failed for call ${call.id}:`, err);
        return { ...call, botStatus: "Statut inconnu" };
      }
    })
  );

  // Same idea as suspiciousCalls above, but with a 15min cache (shorter —
  // no-show detection is meant to surface fresher, since the whole point is
  // catching failures shortly after they happen) and up to 2 calls per
  // meeting when recall_bot_id hasn't been resolved yet: one to look it up
  // from the calendar event, one to fetch the bot's actual status.
  const missedWithStatus = await Promise.all(
    missedMeetings.map(async (meeting) => {
      const fetchedAt = meeting.recall_bot_status_fetched_at
        ? new Date(meeting.recall_bot_status_fetched_at).getTime()
        : null;
      const isFresh = fetchedAt !== null && Date.now() - fetchedAt < MISSED_MEETING_STATUS_CACHE_MS;
      if (isFresh && meeting.recall_bot_status) {
        return { ...meeting, status_label: meeting.recall_bot_status };
      }

      try {
        let botId = meeting.recall_bot_id;
        if (!botId) {
          botId = await getBotIdFromCalendarEvent(meeting.calendar_event_id);
        }
        if (!botId) {
          return { ...meeting, status_label: NO_BOT_FOUND_LABEL };
        }

        const botInfo = await getBotInfo(botId);
        const statusLabel = describeBotStatus(botInfo);
        await updateScheduledMeetingBotStatus(meeting.id, botId, statusLabel);
        return { ...meeting, status_label: statusLabel };
      } catch (err) {
        console.error(`[recall-status] missed meeting status resolution failed for ${meeting.id}:`, err);
        return { ...meeting, status_label: "Statut inconnu" };
      }
    })
  );

  return NextResponse.json({
    upcomingMeetings,
    suspiciousCalls: suspiciousWithStatus,
    missedMeetings: missedWithStatus.map((m) => ({
      id: m.id,
      user_name: m.user_name,
      user_email: m.user_email,
      event_title: m.event_title,
      event_start_at: m.event_start_at,
      status_label: m.status_label,
    })),
  });
}
