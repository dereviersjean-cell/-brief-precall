import type { ConversationAnalytics } from "@/lib/transcript-analytics";

type AnalyticsSpeaker = ConversationAnalytics["speakers"][number];

function formatMmSs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Chiffre clé, étiquette et précision d'une tuile, alignés sur le site.
const STAT_VALUE = "text-[24px] font-semibold leading-none tracking-tight tabular-nums text-slate-900";
const STAT_LABEL = "mt-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500";
const STAT_HINT = "mt-2 text-[13px] leading-relaxed text-slate-600";

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
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-2.5">{label}</p>
      <div className="space-y-1.5">
        {speakers.map((s) => (
          <div key={s.speaker_id} className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-slate-600 truncate">{s.display_name}</span>
            <span className="text-[13px] font-semibold tabular-nums text-slate-900 shrink-0">{valueFor(s)}</span>
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

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Analyse de la conversation</h2>
        <p className="text-[12.5px] text-slate-400 mt-1">
          Statistiques calculées depuis le transcript — qui a parlé quand est visible juste au-dessus.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {showCommercialSections && commercial_prospect_ratio && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[24px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
              {commercial_prospect_ratio.commercial_pct}% / {commercial_prospect_ratio.prospect_pct}%
            </p>
            <p className={STAT_LABEL}>Commercial / Prospect</p>
            <span
              className={`inline-block mt-2.5 text-[11.5px] font-semibold leading-snug px-2 py-0.5 rounded-full ${
                commercial_prospect_ratio.is_healthy
                  ? "bg-[color:var(--success-soft)] text-emerald-700"
                  : "bg-[color:var(--warning-soft)] text-amber-700"
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
          <div className="rounded-xl bg-slate-50 p-4">
            <p className={STAT_VALUE}>{formatMmSs(longestOverall.longest_turn_ms)}</p>
            <p className={STAT_LABEL}>Plus longue intervention</p>
            <p className={STAT_HINT}>{longestOverall.display_name}</p>
          </div>
        )}

        <SpeakerBreakdownCard
          label="Durée moyenne des tours"
          speakers={speakers}
          valueFor={(s) => formatSeconds(s.avg_turn_duration_ms)}
        />

        <div className="rounded-xl bg-slate-50 p-4">
          <p className={STAT_VALUE}>{totalMonologues === 0 ? "Aucun" : totalMonologues}</p>
          <p className={STAT_LABEL}>Monologues &gt; 30s</p>
          <p className={STAT_HINT}>
            {monologueSpeakers.length > 0
              ? monologueSpeakers.map((s) => `${s.display_name} (${s.monologues_count})`).join(" · ")
              : "Aucun monologue"}
          </p>
        </div>

        {showCommercialSections && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className={STAT_VALUE}>{back_and_forth_count}</p>
            <p className={STAT_LABEL}>Échanges dynamiques</p>
            {back_and_forth_count >= 10 && (
              <p className={STAT_HINT}>Rythme conversationnel fluide</p>
            )}
          </div>
        )}

        {silencePct > 0 && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className={STAT_VALUE}>{silencePct}%</p>
            <p className={STAT_LABEL}>Silences</p>
            <p className={STAT_HINT}>{formatMmSs(silenceMs)} sans échange</p>
          </div>
        )}
      </div>
    </div>
  );
}
