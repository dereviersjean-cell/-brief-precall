import type { ConversationAnalytics } from "@/lib/transcript-analytics";

type AnalyticsSpeaker = ConversationAnalytics["speakers"][number];

// bg-indigo-500 is reserved for the commercial (see barSegmentColor) —
// non-commercial speakers cycle through this palette instead.
const PROSPECT_COLORS = ["bg-slate-400", "bg-slate-500", "bg-slate-600", "bg-slate-700"];

function barSegmentColor(speaker: AnalyticsSpeaker, prospectIndex: number): string {
  if (speaker.is_commercial) return "bg-indigo-500";
  return PROSPECT_COLORS[prospectIndex % PROSPECT_COLORS.length];
}

function formatMmSs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

// Per-speaker breakdown card (Questions posées, Durée moyenne des tours) —
// no single natural "headline number" for these, so each speaker gets its
// own line instead of one big stat.
function SpeakerBreakdownCard({
  label,
  speakers,
  valueFor,
}: {
  label: string;
  speakers: AnalyticsSpeaker[];
  valueFor: (speaker: AnalyticsSpeaker) => string;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-1">
        {speakers.map((s) => (
          <div key={s.speaker_id} className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-slate-600 truncate">{s.display_name}</span>
            <span className="text-sm font-semibold text-slate-900 shrink-0">{valueFor(s)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConversationAnalyticsBlock({ analytics }: { analytics: ConversationAnalytics | null }) {
  if (!analytics) return null;

  const { speakers, commercial_prospect_ratio, back_and_forth_count } = analytics;
  const showCommercialSections = commercial_prospect_ratio !== null && speakers.length >= 2;

  const totalQuestions = speakers.reduce((sum, s) => sum + s.questions_count, 0);
  const longestOverall = speakers.reduce((max, s) => (s.longest_turn_ms > max.longest_turn_ms ? s : max), speakers[0]);
  const totalMonologues = speakers.reduce((sum, s) => sum + s.monologues_count, 0);
  const monologueSpeakers = speakers.filter((s) => s.monologues_count > 0);

  // talk_time_ratio is per-speaker vs. total_duration_ms, so speakers rarely
  // sum to 100% — the gap is silence/crosstalk/dead air (e.g. ~43% on the
  // Ravachol/Hubert call, mostly the rocky technical start). Made explicit
  // as its own segment + legend line rather than left as unlabeled bar space.
  const sumTalkTimeMs = speakers.reduce((sum, s) => sum + s.talk_time_ms, 0);
  const silenceMs = Math.max(0, analytics.total_duration_ms - sumTalkTimeMs);
  const silencePct = analytics.total_duration_ms > 0 ? Math.round((100 * silenceMs) / analytics.total_duration_ms) : 0;

  let prospectIndex = 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">🎧 Analyse de la conversation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Statistiques calculées depuis le transcript</p>
      </div>

      {/* Talk-time segmented bar — width per speaker is talk_time_ratio (vs.
          total_duration_ms, not vs. sum of talk times). Whatever's left
          (silence/crosstalk/dead air) gets its own explicit "Silences"
          segment below rather than being left as unlabeled bar space. */}
      <div className="w-full h-6 rounded-full overflow-hidden bg-slate-100 flex">
        {speakers.map((s) => {
          const pct = Math.round(s.talk_time_ratio * 100);
          const color = barSegmentColor(s, s.is_commercial ? 0 : prospectIndex);
          if (!s.is_commercial) prospectIndex++;
          const wide = pct >= 12;
          return (
            <div
              key={s.speaker_id}
              className={`h-full ${color} flex items-center justify-center overflow-hidden transition-all`}
              style={{ width: `${pct}%` }}
              title={wide ? undefined : `${s.display_name} — ${pct}%`}
            >
              {wide && (
                <span className="text-[11px] font-medium text-white px-1 truncate">
                  {s.display_name} {pct}%
                </span>
              )}
            </div>
          );
        })}
        {silencePct > 0 && (
          <div
            className="h-full bg-slate-200 flex items-center justify-center overflow-hidden transition-all"
            style={{ width: `${silencePct}%` }}
            title={silencePct < 12 ? `Silences — ${silencePct}%` : undefined}
          >
            {silencePct >= 12 && (
              <span className="text-[11px] font-medium text-slate-500 px-1 truncate">Silences {silencePct}%</span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 mb-5">
        {(() => {
          let legendProspectIndex = 0;
          return speakers.map((s) => {
            const color = barSegmentColor(s, s.is_commercial ? 0 : legendProspectIndex);
            if (!s.is_commercial) legendProspectIndex++;
            return (
              <div key={s.speaker_id} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                <span className="font-medium text-slate-700">{s.display_name}</span>
                <span className="text-slate-400">
                  {formatMmSs(s.talk_time_ms)} · {Math.round(s.talk_time_ratio * 100)}%
                </span>
              </div>
            );
          });
        })()}
        {silencePct > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
            <span className="font-medium text-slate-700">Silences</span>
            <span className="text-slate-400">
              {formatMmSs(silenceMs)} · {silencePct}%
            </span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {showCommercialSections && commercial_prospect_ratio && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-slate-900">
              {commercial_prospect_ratio.commercial_pct}% / {commercial_prospect_ratio.prospect_pct}%
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Commercial / Prospect</p>
            <span
              className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                commercial_prospect_ratio.is_healthy
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {commercial_prospect_ratio.is_healthy
                ? "Bon équilibre"
                : commercial_prospect_ratio.commercial_pct > 55
                ? "Vous avez trop parlé — laissez plus de place au prospect en découverte"
                : "Le prospect domine l'échange"}
            </span>
          </div>
        )}

        <SpeakerBreakdownCard
          label={`Questions posées (${totalQuestions})`}
          speakers={speakers}
          valueFor={(s) => `${s.questions_count}`}
        />

        {longestOverall && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-slate-900">{formatMmSs(longestOverall.longest_turn_ms)}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Plus longue intervention</p>
            <p className="text-sm text-slate-600 mt-2">{longestOverall.display_name}</p>
          </div>
        )}

        <SpeakerBreakdownCard
          label="Durée moyenne des tours"
          speakers={speakers}
          valueFor={(s) => formatSeconds(s.avg_turn_duration_ms)}
        />

        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-2xl font-semibold text-slate-900">{totalMonologues === 0 ? "Aucun" : totalMonologues}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Monologues &gt; 30s</p>
          <p className="text-sm text-slate-600 mt-2">
            {monologueSpeakers.length > 0
              ? monologueSpeakers.map((s) => `${s.display_name} (${s.monologues_count})`).join(" · ")
              : "Aucun monologue"}
          </p>
        </div>

        {showCommercialSections && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-2xl font-semibold text-slate-900">{back_and_forth_count}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">Échanges dynamiques</p>
            {back_and_forth_count >= 10 && (
              <p className="text-sm text-slate-600 mt-2">Rythme conversationnel fluide</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
