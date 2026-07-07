import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getUpcomingScheduledMeetings,
  getUpcomingScheduledMeetingsForUser,
  getFailedRecordingsForAdmin,
  updateCallRecallBotStatus,
  updateScheduledMeetingBotStatus,
  type FailedRecording,
} from "@/lib/db";
import { getBotInfo, getBotIdFromCalendarEvent } from "@/lib/recall";

const CALL_STATUS_CACHE_MS = 60 * 60 * 1000;
const MEETING_STATUS_CACHE_MS = 15 * 60 * 1000;
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

// Unified per-item resolver for both sources (calls and scheduled_meetings).
// Calls always already have a recall_bot_id (query guarantees it); meetings
// may need one extra lookup to resolve it from the calendar event, which is
// then persisted so it's never re-resolved again.
async function resolveFailedRecordingStatus(item: FailedRecording): Promise<FailedRecording & { status_label: string }> {
  const cacheMs = item.source === "meeting" ? MEETING_STATUS_CACHE_MS : CALL_STATUS_CACHE_MS;
  const fetchedAt = item.recall_bot_status_fetched_at ? new Date(item.recall_bot_status_fetched_at).getTime() : null;
  const isFresh = fetchedAt !== null && Date.now() - fetchedAt < cacheMs;
  if (isFresh && item.recall_bot_status) {
    return { ...item, status_label: item.recall_bot_status };
  }

  const recordId = item.id.split(":")[1];

  try {
    let botId = item.recall_bot_id;
    if (!botId && item.source === "meeting" && item.calendar_event_id) {
      botId = await getBotIdFromCalendarEvent(item.calendar_event_id);
    }
    if (!botId) {
      return { ...item, status_label: NO_BOT_FOUND_LABEL };
    }

    const botInfo = await getBotInfo(botId);
    const statusLabel = describeBotStatus(botInfo);

    if (item.source === "call") {
      await updateCallRecallBotStatus(recordId, statusLabel);
    } else {
      await updateScheduledMeetingBotStatus(recordId, botId, statusLabel);
    }

    return { ...item, status_label: statusLabel };
  } catch (err) {
    console.error(`[recall-status] status resolution failed for ${item.id}:`, err);
    return { ...item, status_label: "Statut inconnu" };
  }
}

// Also serves the per-user admin page (?userId=...). Behavior is unchanged
// when userId is absent.
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

  const [upcomingMeetings, failedRecordings] = await Promise.all([
    userId ? getUpcomingScheduledMeetingsForUser(userId) : getUpcomingScheduledMeetings(),
    getFailedRecordingsForAdmin(20, userId),
  ]);

  // Only path in this route that calls the Recall API — capped at the 20
  // rows already enforced by getFailedRecordingsForAdmin's global limit, and
  // skipped per-item whenever its cache is still fresh.
  const failedWithStatus = await Promise.all(failedRecordings.map(resolveFailedRecordingStatus));

  return NextResponse.json({
    upcomingMeetings,
    failedRecordings: failedWithStatus.map((r) => ({
      id: r.id,
      source: r.source,
      user_id: r.user_id,
      user_email: r.user_email,
      user_name: r.user_name,
      event_title: r.event_title,
      event_start_at: r.event_start_at,
      status_label: r.status_label,
    })),
  });
}
