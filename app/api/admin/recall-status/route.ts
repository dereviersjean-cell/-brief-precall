import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getUpcomingScheduledMeetings, getSuspiciousRecentCalls, updateCallRecallBotStatus } from "@/lib/db";
import { getBotInfo } from "@/lib/recall";

const BOT_STATUS_CACHE_MS = 60 * 60 * 1000;

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

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const [upcomingMeetings, suspiciousCalls] = await Promise.all([
    getUpcomingScheduledMeetings(),
    getSuspiciousRecentCalls(20),
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

  return NextResponse.json({ upcomingMeetings, suspiciousCalls: suspiciousWithStatus });
}
