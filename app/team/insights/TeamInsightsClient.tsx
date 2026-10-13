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
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <FadeIn>
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900">Ce que l&apos;équipe maîtrise, ce qu&apos;elle rate</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            Lecture des objections rencontrées en rendez-vous et de la façon dont elles ont été traitées.
          </p>
        </div>
      </FadeIn>

      {!hasAnything ? (
        <FadeIn>
          <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
            <p className="text-[14px] font-semibold text-slate-900">Pas encore de calls analysés.</p>
            <p className="mt-1 text-[13px] text-slate-500">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <header className="mb-1">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    Ce qui bloque le plus
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                    Classé par nombre d&apos;occasions ratées — ni le volume seul, ni le taux d&apos;échec seul
                    ne disent où se trouve le vrai coût.
                  </p>
                </header>
                <div className="divide-y divide-border">
                  {blockers.slice(0, 6).map((stat) => (
                    <ObjectionRow key={stat.categoryId ?? stat.label} stat={stat} />
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {mastered.length > 0 && (
            <FadeIn>
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <header className="mb-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    Ce que l&apos;équipe maîtrise
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                    Objections systématiquement traitées — la réponse existe déjà quelque part dans
                    l&apos;équipe, elle mérite d&apos;être écrite dans le playbook.
                  </p>
                </header>
                <div className="flex flex-wrap gap-2">
                  {mastered.slice(0, 8).map((stat) => (
                    <span
                      key={stat.categoryId ?? stat.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {stat.label}
                      <span className="tabular-nums text-emerald-700/70">×{stat.wellHandled}</span>
                    </span>
                  ))}
                </div>
              </section>
            </FadeIn>
          )}

          {teamScores && teamScores.dimensions.length > 0 && (
            <FadeIn>
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                      Scores du playbook
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
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
                        <span className="text-[13px] text-slate-600">{dim.label}</span>
                        <span className="text-[13px] font-semibold tabular-nums text-slate-900">
                          {dim.average !== null ? (
                            <>
                              {dim.average.toFixed(1)}
                              <span className="font-normal text-slate-400"> / 5</span>
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
                          className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--primary)]"
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
              <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1">
                  Entraînement
                </h2>
                {/* Volontairement limité à un agrégat : le contenu des
                    sessions est un espace sûr, jamais exposé au manager
                    (décision produit du 24/07/2026). */}
                <p className="mb-3 text-[13px] leading-relaxed text-slate-500">
                  Compteurs seuls — le contenu des sessions reste privé.
                </p>
                <div className="divide-y divide-border">
                  {trainingStats.map((s) => (
                    <div key={s.userId} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-slate-700">
                        <Dumbbell className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {s.name ?? s.email}
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-600">
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
    neutral: "text-slate-600 bg-slate-100",
    success: "text-emerald-700 bg-[color:var(--success-soft)]",
    danger: "text-rose-700 bg-[color:var(--danger-soft)]",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[24px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{value}</p>
        <p className="mt-1.5 truncate text-[12px] text-slate-500">{label}</p>
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
          <p className="text-[13.5px] font-semibold text-slate-900">{stat.label}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
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
              <span className="font-medium text-amber-700">aucune réponse définie dans le playbook</span>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-rose-700">
          {stat.notHandled} sans réponse
          {rate !== null && ` · ${Math.round(rate * 100)} %`}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-[color:var(--success)]" style={{ width: `${pct(stat.wellHandled)}%` }} />
        <div className="bg-[color:var(--warning)]" style={{ width: `${pct(stat.partiallyHandled)}%` }} />
        <div className="bg-[color:var(--danger)]" style={{ width: `${pct(stat.notHandled)}%` }} />
      </div>
    </div>
  );
}
