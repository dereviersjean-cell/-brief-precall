"use client";

import { useState } from "react";
import { Activity, Radio } from "lucide-react";
import type { CommercialAnalytics, TeamAnalytics } from "@/lib/db";

// Onglet Performance > Analytics — deux familles de métriques (Activité,
// Interactions), une tuile par métrique, et pour la métrique sélectionnée un
// classement des commerciaux en barres avec la moyenne d'équipe en repère.
//
// Pas de librairie de graphiques : ce sont des barres horizontales
// proportionnelles, du CSS suffit, et c'est une dépendance de moins dans le
// bundle client.

type Family = "activity" | "interactions";

type Tone = "good" | "warn" | "neutral";

type Metric = {
  key: string;
  label: string;
  help: string;
  // Valeur brute par commercial ; null = pas de donnée sur la période, la
  // barre n'est alors pas affichée (jamais rendue comme un zéro, qui se
  // lirait comme une contre-performance).
  value: (c: CommercialAnalytics | TeamAnalytics["teamAverage"]) => number | null;
  format: (value: number) => string;
  // Sens de lecture : « plus haut = mieux » n'est pas vrai pour toutes les
  // métriques (un monologue long est mauvais), d'où un ton explicite par
  // métrique plutôt qu'une règle globale.
  tone: (value: number) => Tone;
};

function formatMinutes(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

function formatHours(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")} h` : `${minutes} min`;
}

// Seuils « sain / à surveiller », rassemblés ici volontairement : ce sont les
// seuls jugements de valeur de tout l'onglet, ils doivent être trouvables et
// discutables d'un coup d'œil plutôt que dispersés dans le rendu.
const HEALTHY = {
  talkRatioPct: (v: number) => v >= 35 && v <= 55,
  longestMonologueMs: (v: number) => v < 120_000,
  longestProspectStoryMs: (v: number) => v > 60_000,
  interactivityScore: (v: number) => v >= 5,
  patienceMs: (v: number) => v >= 800,
  questionRate: (v: number) => v >= 12,
};

const ACTIVITY_METRICS: Metric[] = [
  {
    key: "avgDuration",
    label: "Durée de RDV",
    help: "Durée moyenne d'un rendez-vous.",
    value: (c) => c.avgDurationSeconds,
    format: (v) => formatHours(v),
    tone: () => "neutral",
  },
  {
    key: "weeklyVolume",
    label: "Volume hebdo de RDV",
    help: "Nombre de rendez-vous par semaine sur la période.",
    value: (c) => c.weeklyCallsVolume,
    format: (v) => v.toFixed(2),
    tone: () => "neutral",
  },
  {
    key: "weeklyTime",
    label: "Temps hebdo en RDV",
    help: "Temps passé en rendez-vous par semaine.",
    value: (c) => c.weeklyDurationSeconds,
    format: (v) => formatHours(v),
    tone: () => "neutral",
  },
  {
    key: "totalVolume",
    label: "Volume total de RDV",
    help: "Nombre de rendez-vous sur toute la période.",
    value: (c) => c.callsCount,
    format: (v) => String(Math.round(v)),
    tone: () => "neutral",
  },
  {
    key: "totalTime",
    label: "Temps total en RDV",
    help: "Temps cumulé passé en rendez-vous sur la période.",
    value: (c) => c.totalDurationSeconds,
    format: (v) => formatHours(v),
    tone: () => "neutral",
  },
];

const INTERACTION_METRICS: Metric[] = [
  {
    key: "talkRatio",
    label: "Ratio parole / écoute",
    help: "Part du temps de parole prise par le commercial. En découverte, on vise 35-55 %.",
    value: (c) => c.talkRatioPct,
    format: (v) => `${Math.round(v)} %`,
    tone: (v) => (HEALTHY.talkRatioPct(v) ? "good" : "warn"),
  },
  {
    key: "longestMonologue",
    label: "Plus long monologue",
    help: "Plus longue prise de parole ininterrompue du commercial, en moyenne par call.",
    value: (c) => c.longestMonologueMs,
    format: formatMinutes,
    tone: (v) => (HEALTHY.longestMonologueMs(v) ? "good" : "warn"),
  },
  {
    key: "longestProspectStory",
    label: "Plus longue réponse prospect",
    help: "Plus longue prise de parole du prospect : plus elle est longue, plus il s'est ouvert.",
    value: (c) => c.longestProspectStoryMs,
    format: formatMinutes,
    tone: (v) => (HEALTHY.longestProspectStoryMs(v) ? "good" : "warn"),
  },
  {
    key: "interactivity",
    label: "Score d'interactivité",
    help: "Vivacité de l'échange, sur 10 : fréquence des alternances de parole.",
    value: (c) => c.interactivityScore,
    format: (v) => v.toFixed(1),
    tone: (v) => (HEALTHY.interactivityScore(v) ? "good" : "warn"),
  },
  {
    key: "patience",
    label: "Patience",
    help: "Blanc laissé avant de reprendre la parole après le prospect. Trop court = on lui coupe la parole.",
    value: (c) => c.patienceMs,
    format: (v) => `${(v / 1000).toFixed(1)} s`,
    tone: (v) => (HEALTHY.patienceMs(v) ? "good" : "warn"),
  },
  {
    key: "questionRate",
    label: "Taux de questions",
    help: "Questions posées par le commercial, par heure de rendez-vous.",
    value: (c) => c.questionRate,
    format: (v) => v.toFixed(1),
    tone: (v) => (HEALTHY.questionRate(v) ? "good" : "warn"),
  },
];

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  neutral: "bg-[color:var(--violet)]",
};

const TONE_BAR: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-400",
  neutral: "bg-[color:var(--violet)]",
};

export default function AnalyticsClient({
  analytics,
  currentUserId,
  // Un commercial ne voit que sa propre barre (le classement nominatif de
  // l'équipe reste une vue manager) — la moyenne d'équipe, elle, reste
  // affichée : c'est un repère agrégé, pas une donnée sur un collègue.
  showTeamRoster,
}: {
  analytics: TeamAnalytics;
  currentUserId: string;
  showTeamRoster: boolean;
}) {
  const [family, setFamily] = useState<Family>("activity");
  const metrics = family === "activity" ? ACTIVITY_METRICS : INTERACTION_METRICS;
  const [selectedKey, setSelectedKey] = useState<string>(ACTIVITY_METRICS[0].key);

  const metric = metrics.find((m) => m.key === selectedKey) ?? metrics[0];

  const rows = (showTeamRoster ? analytics.commercials : analytics.commercials.filter((c) => c.userId === currentUserId))
    .map((commercial) => ({ commercial, value: metric.value(commercial) }))
    .filter((row): row is { commercial: CommercialAnalytics; value: number } => row.value !== null)
    .sort((a, b) => b.value - a.value);

  const teamValue = metric.value(analytics.teamAverage);
  const maxValue = Math.max(...rows.map((r) => r.value), teamValue ?? 0, 1);

  return (
    <div>
      <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-[var(--shadow-xs)]">
        {(
          [
            ["activity", "Activité", Activity],
            ["interactions", "Interactions", Radio],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFamily(value);
              setSelectedKey((value === "activity" ? ACTIVITY_METRICS : INTERACTION_METRICS)[0].key);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
              family === value
                ? "bg-[color:var(--lavender)] text-[color:var(--violet)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-sm)]">
        <div data-tour="analytics-tiles" className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-b border-slate-100 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => {
            const value = m.value(analytics.teamAverage);
            const active = m.key === metric.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedKey(m.key)}
                title={m.help}
                className={`px-4 py-4 text-left transition-colors ${active ? "bg-[color:var(--lavender)]" : "hover:bg-slate-50"}`}
              >
                <p className="flex items-center gap-1.5 text-[19px] font-semibold text-slate-900">
                  {value !== null && (
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[m.tone(value)]}`} />
                  )}
                  {value === null ? "—" : m.format(value)}
                </p>
                <p className="mt-0.5 text-[12.5px] text-slate-500">{m.label}</p>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-6">
          <p className="text-sm font-semibold text-slate-900">{metric.label}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">{metric.help}</p>

          {rows.length === 0 ? (
            <p className="mt-6 text-sm italic text-slate-400">
              Aucune donnée sur cette période.
              {family === "interactions" &&
                " Les métriques d'interaction nécessitent un transcript exploitable — elles apparaissent au fur et à mesure des calls analysés."}
            </p>
          ) : (
            <div className="mt-6">
              {teamValue !== null && (
                <p className="mb-2 text-right text-xs text-slate-400">
                  Moyenne d&apos;équipe {metric.format(teamValue)}
                </p>
              )}
              <ul className="space-y-2.5">
                {rows.map(({ commercial, value }) => {
                  const isSelf = commercial.userId === currentUserId;
                  return (
                    <li key={commercial.userId} className="flex items-center gap-3">
                      <span
                        className={`w-40 shrink-0 truncate text-[13px] ${
                          isSelf ? "font-semibold text-slate-900" : "text-slate-600"
                        }`}
                        title={commercial.name ?? commercial.email}
                      >
                        {commercial.name ?? commercial.email}
                      </span>
                      <span className="w-20 shrink-0 text-right text-[13px] font-medium text-slate-900">
                        {metric.format(value)}
                      </span>
                      <span className="relative h-2 flex-1 overflow-visible rounded-full bg-slate-100">
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${TONE_BAR[metric.tone(value)]}`}
                          style={{ width: `${Math.max(2, (100 * value) / maxValue)}%` }}
                        />
                        {teamValue !== null && (
                          <span
                            className="absolute -top-1 bottom-[-4px] w-px border-l border-dashed border-slate-400"
                            style={{ left: `${Math.min(100, (100 * teamValue) / maxValue)}%` }}
                            aria-hidden
                          />
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
