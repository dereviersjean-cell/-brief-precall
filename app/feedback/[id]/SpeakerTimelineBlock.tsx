"use client";

export type TimelineTurn = {
  speakerId: string;
  displayName: string;
  startMs: number;
  endMs: number;
};

type SpeakerRow = {
  speakerId: string;
  displayName: string;
  totalMs: number;
  turns: { startMs: number; endMs: number }[];
};

// Same palette convention as ConversationAnalyticsBlock's barSegmentColor —
// kept as a separate small copy rather than a shared import since the two
// components color by a different key (this one has no is_commercial flag
// to prioritize indigo for, just talk-time rank).
const SPEAKER_COLORS = ["bg-indigo-500", "bg-slate-500", "bg-amber-500", "bg-violet-500", "bg-teal-500", "bg-rose-400"];

function formatMmSs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}min ${String(s).padStart(2, "0")}s`;
}

// "Qui a parlé quand" — one horizontal track per speaker spanning the full
// call duration, with a mark per turn positioned/sized by start_ms/end_ms.
// Complements ConversationAnalyticsBlock's aggregate proportion bar with the
// actual timing — clicking a mark seeks the video (onSeek), same as a
// transcript row.
export default function SpeakerTimelineBlock({
  turns,
  totalDurationMs,
  onSeek,
  seekable,
}: {
  turns: TimelineTurn[];
  totalDurationMs: number;
  onSeek: (ms: number) => void;
  seekable: boolean;
}) {
  if (turns.length === 0 || totalDurationMs <= 0) return null;

  const bySpeaker = new Map<string, SpeakerRow>();
  for (const t of turns) {
    const row = bySpeaker.get(t.speakerId) ?? { speakerId: t.speakerId, displayName: t.displayName, totalMs: 0, turns: [] };
    row.totalMs += t.endMs - t.startMs;
    row.turns.push({ startMs: t.startMs, endMs: t.endMs });
    row.displayName = t.displayName; // last-write-wins, matches live rename overrides
    bySpeaker.set(t.speakerId, row);
  }
  const rows = Array.from(bySpeaker.values()).sort((a, b) => b.totalMs - a.totalMs);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🎙️ Qui a parlé, et quand</h2>
      <div className="space-y-4">
        {rows.map((row, i) => {
          const color = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
          const pct = totalDurationMs > 0 ? Math.round((100 * row.totalMs) / totalDurationMs) : 0;
          return (
            <div key={row.speakerId}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-slate-700 truncate">{row.displayName}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">
                  {formatMmSs(row.totalMs)} · {pct}%
                </span>
              </div>
              <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                {row.turns.map((turn, ti) => {
                  const leftPct = (turn.startMs / totalDurationMs) * 100;
                  const widthPct = Math.max(((turn.endMs - turn.startMs) / totalDurationMs) * 100, 0.5);
                  return (
                    <button
                      key={ti}
                      type="button"
                      disabled={!seekable}
                      onClick={() => onSeek(turn.startMs)}
                      title={`${formatMmSs(turn.startMs)}`}
                      className={`absolute top-0 h-full ${color} ${seekable ? "hover:opacity-70 cursor-pointer" : "cursor-default"} transition-opacity`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
