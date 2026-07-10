import type { TranscriptJson } from "./recall";

export type ConversationAnalytics = {
  total_duration_ms: number;
  speakers: Array<{
    speaker_id: string;
    display_name: string;
    is_commercial: boolean;
    talk_time_ms: number;
    talk_time_ratio: number;
    questions_count: number;
    longest_turn_ms: number;
    avg_turn_duration_ms: number;
    monologues_count: number;
  }>;
  back_and_forth_count: number;
  commercial_prospect_ratio: {
    commercial_pct: number;
    prospect_pct: number;
    is_healthy: boolean;
  } | null;
};

const MONOLOGUE_THRESHOLD_MS = 30_000;
const BACK_AND_FORTH_TURN_THRESHOLD_MS = 15_000;
const MIN_TURNS_FOR_ANALYTICS = 5;

function turnDurationMs(turn: TranscriptJson["turns"][number]): number {
  return turn.end_ms - turn.start_ms;
}

// Pure by design (no DB/Recall calls) — easy to unit-test, and keeps the
// server component in full control of when/whether to compute this.
//
// `commercialName` is the CALLER's already-resolved getUserName(ownerUserId)
// result, not a raw user id: the brief's own heuristic description
// ("le speaker dont le display_name correspond à getUserName(ownerUserId)")
// requires a name-to-name string comparison, which only a caller allowed to
// do I/O can produce — this function stays synchronous and takes that
// result directly, exactly as the brief's alternative phrasing allows
// ("passé en paramètre"). `commercialSpeakerId`, when known ahead of time,
// skips the name-matching heuristic entirely for that speaker.
//
// Returns null when there's too little data to say anything meaningful
// (fewer than 5 turns — a failed/truncated Recall transcript) — the single
// check FeedbackDetailClient/ConversationAnalyticsBlock need to hide the
// block, whether the cause is "no transcript_json at all" (page.tsx never
// calls this) or "transcript_json exists but is too sparse" (this early
// return).
export function computeConversationAnalytics(
  transcriptJson: TranscriptJson,
  speakerNamesOverride: Record<string, string>,
  commercialName: string | null,
  commercialSpeakerId?: string
): ConversationAnalytics | null {
  const turns = transcriptJson.turns;
  if (turns.length < MIN_TURNS_FOR_ANALYTICS) return null;

  const speakerIds = Array.from(new Set(turns.map((t) => t.speaker_id)));
  const normalizedCommercialName = commercialName?.trim() || null;

  const speakers = speakerIds.map((speakerId) => {
    const speakerTurns = turns.filter((t) => t.speaker_id === speakerId);
    const durations = speakerTurns.map(turnDurationMs);
    const talkTimeMs = durations.reduce((sum, d) => sum + d, 0);
    const displayName = speakerNamesOverride[speakerId] || speakerId;

    const isCommercial =
      commercialSpeakerId != null
        ? speakerId === commercialSpeakerId
        : normalizedCommercialName != null && displayName.trim() === normalizedCommercialName;

    return {
      speaker_id: speakerId,
      display_name: displayName,
      is_commercial: isCommercial,
      talk_time_ms: talkTimeMs,
      talk_time_ratio: transcriptJson.total_duration_ms > 0 ? talkTimeMs / transcriptJson.total_duration_ms : 0,
      questions_count: speakerTurns.filter((t) => /\?/.test(t.text)).length,
      longest_turn_ms: durations.length > 0 ? Math.max(...durations) : 0,
      avg_turn_duration_ms: durations.length > 0 ? talkTimeMs / durations.length : 0,
      monologues_count: durations.filter((d) => d > MONOLOGUE_THRESHOLD_MS).length,
    };
    // Most-talkative first — the natural reading order for the UI (ratio
    // bar, legend, per-speaker cards all want the dominant speaker first).
  }).sort((a, b) => b.talk_time_ms - a.talk_time_ms);

  let backAndForthCount = 0;
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1];
    const curr = turns[i];
    if (
      prev.speaker_id !== curr.speaker_id &&
      turnDurationMs(prev) < BACK_AND_FORTH_TURN_THRESHOLD_MS &&
      turnDurationMs(curr) < BACK_AND_FORTH_TURN_THRESHOLD_MS
    ) {
      backAndForthCount++;
    }
  }

  const commercialTalkTimeMs = speakers.filter((s) => s.is_commercial).reduce((sum, s) => sum + s.talk_time_ms, 0);
  const prospectTalkTimeMs = speakers.filter((s) => !s.is_commercial).reduce((sum, s) => sum + s.talk_time_ms, 0);
  const totalSpokenMs = commercialTalkTimeMs + prospectTalkTimeMs;

  // Null whenever no speaker was confidently matched to the commercial —
  // showing a ratio built on a guess would be actively misleading (per the
  // brief: never fall back to "most-talkative = commercial" here, that
  // heuristic only exists in resolveSpeakerNames at ingestion time).
  const commercialIdentified = speakers.some((s) => s.is_commercial);
  const commercialProspectRatio =
    commercialIdentified && totalSpokenMs > 0
      ? (() => {
          const commercialPct = Math.round((100 * commercialTalkTimeMs) / totalSpokenMs);
          const prospectPct = 100 - commercialPct;
          return {
            commercial_pct: commercialPct,
            prospect_pct: prospectPct,
            is_healthy: commercialPct >= 35 && commercialPct <= 55,
          };
        })()
      : null;

  return {
    total_duration_ms: transcriptJson.total_duration_ms,
    speakers,
    back_and_forth_count: backAndForthCount,
    commercial_prospect_ratio: commercialProspectRatio,
  };
}
