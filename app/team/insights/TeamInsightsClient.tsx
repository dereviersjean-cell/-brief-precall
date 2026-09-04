"use client";

import { AlertTriangle, CheckCircle2, Dumbbell, Target, Users } from "lucide-react";
import type { ObjectionCategoryStat, TeamAverageScores, TrainingTeamStat } from "@/lib/db";
import FadeIn from "@/app/dashboard/FadeIn";
import Link from "next/link";

// Une objection « traitée » réunit les deux verdicts favorables : le
// classifieur distingue « bien traitée » de « partiellement », mais du point
// de vue du manager les deux signifient que le commercial a répondu quelque
// chose. Ce qui l'intéresse, c'est ce qui est resté sans réponse.
function evaluated(s: ObjectionCategoryStat): number {
  return s.wellHandled + s.partiallyHandled + s.notHandled;
}

function missHandledRate(s: ObjectionCategoryStat): number | null {
  const total = evaluated(s);
  return total === 0 ? null : s.notHandled / total;
}

// Le classement ne se fait NI sur le volume seul (une objection fréquente
// mais bien traitée ne coûte rien) NI sur le taux d'échec seul (100 % d'échec
// sur une occurrence unique n'est pas un problème d'équipe). Le nombre
// d'occasions RATÉES combine déjà les deux, et c'est ce qui coûte vraiment.
function missedCount(s: ObjectionCategoryStat): number {
  return s.notHandled;
}

export default function TeamInsightsClient({
  objectionStats,
  teamScores,
  trainingStats,
}: {
  objectionStats: ObjectionCategoryStat[];
  teamScores: TeamAverageScores | null;
  trainingStats: TrainingTeamStat[];
}) {
  const withData = objectionStats.filter((s) => evaluated(s) > 0);
  const totalOccurrences = withData.reduce((sum, s) => sum + evaluated(s), 0);
  const totalMissed = withData.reduce((sum, s) => sum + s.notHandled, 0);
  const totalWell = withData.reduce((sum, s) => sum + s.wellHandled, 0);

  const blockers = [...withData].sort((a, b) => missedCount(b) - missedCount(a)).filter((s) => s.notHandled > 0);
  const mastered = [...withData]
    .filter((s) => s.notHandled === 0 && s.wellHandled > 0)
    .sort((a, b) => b.wellHandled - a.wellHandled);

  const hasAnything = totalOccurrences > 0 || (teamScores?.calls_analyzed_count ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto w-full px-6 py-8 space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ce que l&apos;équipe maîtrise, ce qu&apos;elle rate</h1>
          <p className="text-slate-500 text-sm mt-1">
            Lecture des objections rencontrées en rendez-vous et de la façon dont elles ont été traitées.
          </p>
        </div>
      </FadeIn>

      {!hasAnything ? (
        <FadeIn>
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-10 text-center">
            <p className="text-slate-700 font-medium">Pas encore de calls analysés.</p>
            <p className="text-slate-400 text-sm mt-1">
              Cette page se remplit dès que les premiers rendez-vous de l&apos;équipe sont analysés.
            </p>
          </div>
        </FadeIn>
      ) : (
        <>
          {/* La synthèse est calculée, pas rédigée par un modèle : ce sont des
              comptages, les faire reformuler n'ajouterait qu'un risque
              d'écart avec les chiffres affichés juste en dessous. */}
          {totalOccurrences > 0 && (
            <FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryTile
                  icon={<Target className="w-4 h-4" />}
                  value={String(totalOccurrences)}
                  label="objections rencontrées"
                  tone="neutral"
                />
                <SummaryTile
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  value={`${Math.round((totalWell / totalOccurrences) * 100)} %`}
                  label="bien traitées"
                  tone="success"
                />
                <SummaryTile
                  icon={<AlertTriangle className="w-4 h-4" />}
                  value={String(totalMissed)}
                  label={totalMissed > 1 ? "restées sans réponse" : "restée sans réponse"}
                  tone={totalMissed > 0 ? "danger" : "success"}
                />
              </div>
            </FadeIn>
          )}

          {blockers.length > 0 && (
            <FadeIn>
              <section className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                <header className="mb-1">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ce qui bloque le plus
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Classé par nombre d&apos;occasions ratées — ni le volume seul, ni le taux d&apos;échec seul
                    ne disent où se trouve le vrai coût.
                  </p>
                </header>
                <div className="divide-y divide-slate-100">
                  {blockers.slice(0, 6).map((stat) => (
                    <ObjectionRow key={stat.categoryId ?? stat.label} stat={stat} />
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {mastered.length > 0 && (
            <FadeIn>
              <section className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                <header className="mb-3">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Ce que l&apos;équipe maîtrise
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Objections systématiquement traitées — la réponse existe déjà quelque part dans
                    l&apos;équipe, elle mérite d&apos;être écrite dans le playbook.
                  </p>
                </header>
                <div className="flex flex-wrap gap-2">
                  {mastered.slice(0, 8).map((stat) => (
                    <span
                      key={stat.categoryId ?? stat.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-3 py-1 text-[12.5px] font-medium text-emerald-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {stat.label}
                      <span className="text-emerald-600/70">×{stat.wellHandled}</span>
                    </span>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {teamScores && teamScores.dimensions.length > 0 && (
            <FadeIn>
              <section className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Scores du playbook
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Moyennes de l&apos;équipe sur {teamScores.calls_analyzed_count} call
                      {teamScores.calls_analyzed_count > 1 ? "s" : ""} analysé
                      {teamScores.calls_analyzed_count > 1 ? "s" : ""}.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/scores"
                    className="text-[13px] font-medium text-[color:var(--violet)] hover:underline shrink-0"
                  >
                    Détail par commercial →
                  </Link>
                </header>
                <div className="space-y-3">
                  {teamScores.dimensions.map((dim) => (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-600">{dim.label}</span>
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">
                          {dim.average !== null ? (
                            <>
                              {dim.average.toFixed(1)}
                              <span className="text-slate-300 font-normal"> / 5</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        {[1, 2, 3, 4].map((g) => (
                          <span
                            key={g}
                            className="absolute top-0 bottom-0 w-px bg-white/70"
                            style={{ left: `${(g / 5) * 100}%` }}
                          />
                        ))}
                        <div
                          className="absolute inset-y-0 left-0 rounded-full brand-gradient"
                          style={{ width: `${dim.average !== null ? (dim.average / 5) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {trainingStats.length > 0 && (
            <FadeIn>
              <section className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Entraînement
                </h2>
                {/* Volontairement limité à un agrégat : le contenu des
                    sessions est un espace sûr, jamais exposé au manager
                    (décision produit du 24/07/2026). */}
                <p className="text-sm text-slate-500 mb-3">
                  Compteurs seuls — le contenu des sessions reste privé.
                </p>
                <div className="divide-y divide-slate-100">
                  {trainingStats.map((s) => (
                    <div key={s.userId} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-slate-700 flex items-center gap-2">
                        <Dumbbell className="w-3.5 h-3.5 text-slate-300" />
                        {s.name ?? s.email}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {s.sessionsCount} session{s.sessionsCount > 1 ? "s" : ""}
                        {s.avgScore != null && ` · ${s.avgScore.toFixed(1)}/5`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}
        </>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: "neutral" | "success" | "danger";
}) {
  const toneCls = {
    neutral: "text-slate-500 bg-slate-100",
    success: "text-emerald-700 bg-[color:var(--success-soft)]",
    danger: "text-rose-700 bg-[color:var(--danger-soft)]",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-4 flex items-center gap-3">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function ObjectionRow({ stat }: { stat: ObjectionCategoryStat }) {
  const total = evaluated(stat);
  const rate = missHandledRate(stat);
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{stat.label}</p>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              {total} occurrence{total > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {stat.commercialsCount} commercial{stat.commercialsCount > 1 ? "aux" : ""}
            </span>
            {/* Une objection sans réponse écrite dans le playbook est une
                cause d'échec sur laquelle le manager peut agir directement —
                elle vaut d'être signalée ici plutôt que découverte ailleurs. */}
            {!stat.handlingGuidance?.trim() && (
              <span className="text-amber-600">aucune réponse définie dans le playbook</span>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[color:var(--danger-soft)] px-2.5 py-0.5 text-[11.5px] font-semibold text-rose-700 tabular-nums">
          {stat.notHandled} sans réponse
          {rate !== null && ` · ${Math.round(rate * 100)} %`}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
        <div className="bg-emerald-400" style={{ width: `${pct(stat.wellHandled)}%` }} />
        <div className="bg-amber-300" style={{ width: `${pct(stat.partiallyHandled)}%` }} />
        <div className="bg-rose-400" style={{ width: `${pct(stat.notHandled)}%` }} />
      </div>
    </div>
  );
}
