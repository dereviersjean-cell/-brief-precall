"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  FileText,
  LayoutGrid,
  MessageSquareWarning,
  MousePointerClick,
  Phone,
  Radio,
  Target,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { DIMENSIONS, NB, REPS, TEAM, WEEKS, fr, mean, mmss, teamObjections, type Rep } from "./team-data";

// Le tableau de bord Performance de l'app, au format réel : barre latérale
// (Brief, Analyse rendez-vous, Performance), sélecteur « Équipe / un
// commercial » (CommercialSelector), et les quatre onglets de statistiques —
// Vue d'ensemble, Scores, Analytics, Objections — avec les mêmes définitions
// et les mêmes règles que l'app :
//   - moyenne d'équipe = moyenne des commerciaux ;
//   - dimension « à travailler » signalée seulement si elle décroche de plus
//     de 0,3 point ;
//   - seuils « sain / à surveiller » d'Analytics repris de `HEALTHY`
//     (AnalyticsClient) : parole 35-55 %, monologue < 2 min, réponse prospect
//     > 1 min, interactivité ≥ 5, patience ≥ 0,8 s, questions ≥ 12/h.
// Données fictives (team-data.ts), annoncées en pied.

type Tab = "overview" | "scores" | "analytics" | "objections";

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { key: "scores", label: "Scores", icon: TrendingUp },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "objections", label: "Objections", icon: MessageSquareWarning },
];

// ─── Petits éléments ─────────────────────────────────────────────────────────

function Card({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-land-line bg-land-surface p-4 sm:p-5 ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">{title}</div>
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

function Kpi({ label, value, suffix, delta, icon: Icon, tone }: { label: string; value: string; suffix?: string; delta?: number; icon: typeof Activity; tone: string }) {
  return (
    <div className="rounded-2xl border border-land-line bg-land-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-land-faint">{label}</span>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-land-ink">
          {value}
          {suffix && <span className="ml-0.5 text-[14px] font-medium text-land-faint">{suffix}</span>}
        </span>
        {delta !== undefined && (
          <span className={`text-[12px] font-medium tabular-nums ${delta >= 0 ? "text-emerald-600" : "text-land-coral-ink"}`}>
            {delta >= 0 ? "▲" : "▼"} {fr(Math.abs(delta))}
          </span>
        )}
      </div>
    </div>
  );
}

function scoreTone(v: number) {
  if (v >= 3.8) return "text-emerald-600";
  if (v >= 3) return "text-land-accent";
  return "text-land-coral-ink";
}

// ─── Courbe de score (ScoreTrendChart) ───────────────────────────────────────

function TrendChart({ series, compare }: { series: number[]; compare?: number[] }) {
  const W = 560;
  const H = 190;
  const padL = 26;
  const padR = 24;
  const padT = 14;
  const padB = 26;
  const lo = 2.4;
  const hi = 4.2;
  const x = (i: number) => padL + (i / (series.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const line = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const avg = mean(series);
  const first = series[0];
  const last = series[series.length - 1];
  const d = Math.round((last - first) * 10) / 10;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-land-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-land-accent" /> Score moyen
        </span>
        {compare && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-land-faint/70" /> Moyenne d&apos;équipe
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dotted border-amber-400" /> Moyenne de la période
        </span>
        <span className={`ml-auto font-semibold ${d >= 0 ? "text-emerald-600" : "text-land-coral-ink"}`}>
          {d >= 0 ? "+" : "−"}
          {fr(Math.abs(d))}{NB}pt en 6{NB}semaines
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution du score moyen sur six semaines">
        <defs>
          <linearGradient id="perf-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--land-accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--land-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[2.5, 3, 3.5, 4].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="var(--land-line)" />
            <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--land-faint)">
              {fr(g, g % 1 ? 1 : 0)}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(avg)} y2={y(avg)} stroke="#F5B731" strokeWidth={1.5} strokeDasharray="2 4" />
        {compare && <path d={line(compare)} fill="none" stroke="var(--land-faint)" strokeOpacity={0.7} strokeWidth={2} strokeDasharray="5 5" />}
        <path d={`${line(series)} L${x(series.length - 1)} ${H - padB} L${x(0)} ${H - padB} Z`} fill="url(#perf-area)" />
        <path d={line(series)} fill="none" stroke="var(--land-accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {series.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={4} fill="var(--land-surface)" stroke="var(--land-accent)" strokeWidth={2} />
            {i === series.length - 1 && (
              <text x={x(i)} y={y(v) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--land-ink)">
                {fr(v)}
              </text>
            )}
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--land-faint)">
              {WEEKS[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Barres par dimension (DimensionScores) ─────────────────────────────────

function DimensionBars({ dims, compare }: { dims: number[]; compare?: number[] }) {
  const sorted = [...dims].sort((a, b) => a - b);
  const weakest = sorted[0];
  const flagWeak = sorted[1] - weakest > 0.3;
  return (
    <ul className="space-y-3">
      {DIMENSIONS.map((dim, i) => {
        const v = dims[i];
        const weak = flagWeak && v === weakest;
        return (
          <li key={dim.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className={weak ? "font-medium text-land-ink" : "text-land-ink"}>
                {dim.label}
                {weak && <span className="ml-2 rounded-full bg-land-coral-soft px-1.5 py-0.5 text-[11px] font-semibold text-land-coral-ink">à travailler</span>}
              </span>
              <span className="tabular-nums text-land-muted">
                <span className={`font-semibold ${weak ? "text-land-coral-ink" : "text-land-ink"}`}>{fr(v)}</span>
                {NB}/{NB}5
              </span>
            </div>
            <div className="relative mt-1.5 h-2 rounded-full bg-land-sunken">
              {[1, 2, 3, 4].map((g) => (
                <span key={g} className="absolute inset-y-0 w-px bg-land-surface" style={{ left: `${(g / 5) * 100}%` }} aria-hidden />
              ))}
              <span
                className={`land-bar absolute inset-y-0 left-0 w-full rounded-full ${weak ? "bg-land-coral" : "bg-land-accent"}`}
                style={{ transform: `scaleX(${v / 5})` }}
              />
              {compare && (
                <span
                  className="absolute -top-1 bottom-[-4px] w-0.5 rounded-full bg-land-ink/60"
                  style={{ left: `${(compare[i] / 5) * 100}%` }}
                  title="Moyenne d'équipe"
                  aria-hidden
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Onglets ────────────────────────────────────────────────────────────────

function Overview({ rep }: { rep: Rep | null }) {
  const series = rep ? rep.trend : TEAM.trend;
  const calls = rep ? rep.calls : TEAM.calls;
  const briefs = rep ? rep.briefs : TEAM.briefs;
  const objs = rep ? rep.objections.map(([c, g, p, n]) => ({ cat: c, good: g, part: p, none: n })) : teamObjections();
  const total = objs.reduce((a, o) => a + o.good + o.part + o.none, 0);
  const good = objs.reduce((a, o) => a + o.good, 0);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const recent = (rep ? RECENT.filter((c) => c.rep === rep.id) : RECENT).slice(0, 4);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Calls analysés" value={String(calls)} icon={Phone} tone="bg-land-accent-soft text-land-accent" />
        <Kpi label="Briefs générés" value={String(briefs)} icon={FileText} tone="bg-land-lilac-soft text-[oklch(0.5_0.12_295)]" />
        <Kpi label="Score moyen" value={fr(last)} suffix="/5" delta={last - prev} icon={TrendingUp} tone="bg-emerald-50 text-emerald-600" />
        <Kpi
          label="Objections traitées"
          value={String(Math.round((100 * good) / Math.max(1, total)))}
          suffix={`${NB}%`}
          icon={ThumbsUp}
          tone="bg-land-coral-soft text-land-coral-ink"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Score moyen · 6 dernières semaines">
          <TrendChart series={series} compare={rep ? TEAM.trend : undefined} />
        </Card>
        {rep ? (
        <Card title="Calls récents" className="lg:row-span-1">
            <ul className="divide-y divide-land-line">
              {recent.map((c) => {
                const r = REPS.find((x) => x.id === c.rep)!;
                return (
                  <li key={c.title} className="flex items-center gap-3 py-2.5">
                    <Image src={r.photo} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-land-ink">{c.title}</span>
                      <span className="block text-[11.5px] text-land-faint">
                        {r.first} · {c.date} · {c.stage}
                      </span>
                    </span>
                    <span className={`text-[13px] font-semibold tabular-nums ${scoreTone(c.score)}`}>{fr(c.score)}/5</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : (
          <TeamCompact />
        )}
      </div>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 72;
  const h = 22;
  const lo = Math.min(...values) - 0.1;
  const hi = Math.max(...values) + 0.1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[22px] w-[72px]" aria-hidden>
      <polyline points={pts} fill="none" stroke={up ? "var(--land-accent)" : "var(--land-coral)"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// L'équipe en un coup d'œil : pour chaque commercial, sa note, sa pente et la
// dimension qui décroche (même règle des 0,3 pt que l'app).
function TeamCompact() {
  return (
    <Card title="L'équipe en un coup d'œil">
      <ul className="divide-y divide-land-line">
        {[...REPS]
          .sort((a, b) => b.trend[5] - a.trend[5])
          .map((r) => {
            const order = r.dims.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
            const [wv, wi] = order[order.length - 1];
            const flag = order[order.length - 2][0] - wv > 0.3;
            const d = Math.round((r.trend[5] - r.trend[0]) * 10) / 10;
            return (
              <li key={r.id} className="py-2.5">
                <div className="flex items-center gap-2.5">
                  <Image src={r.photo} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-land-ink">{r.name}</span>
                  <Spark values={r.trend} />
                  <span className={`w-9 text-right text-[13px] font-semibold tabular-nums ${scoreTone(r.trend[5])}`}>{fr(r.trend[5])}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-[38px] text-[11.5px]">
                  <span className={`tabular-nums ${d >= 0 ? "text-emerald-600" : "text-land-coral-ink"}`}>
                    {d >= 0 ? "+" : "−"}
                    {fr(Math.abs(d))} en 6{NB}sem.
                  </span>
                  {flag && (
                    <span className="truncate rounded-full bg-land-coral-soft px-2 py-px text-land-coral-ink">
                      À travailler : {DIMENSIONS[wi].short.toLowerCase()} {fr(wv)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
      </ul>
    </Card>
  );
}

function Scores({ rep }: { rep: Rep | null }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
      <Card
        title={rep ? `Grille de ${rep.first}` : "Grille de l'équipe"}
        aside={rep && <span className="text-[11.5px] text-land-faint">trait : moyenne d&apos;équipe</span>}
      >
        <DimensionBars dims={rep ? rep.dims : TEAM.dims} compare={rep ? TEAM.dims : undefined} />
      </Card>
      <Card title="Commercial × dimension" aside={<span className="text-[11.5px] text-land-faint">sur 5</span>}>
        {/* Carte de chaleur : où chacun tient, où chacun lâche. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] table-fixed border-separate border-spacing-1 text-[12px]">
            <thead>
              <tr>
                <th className="w-[74px]" />
                {DIMENSIONS.map((d) => (
                  <th key={d.short} title={d.label} className="pb-1 text-center font-medium text-land-faint">
                    {d.abbr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REPS.map((r) => (
                <tr key={r.id} className={rep && rep.id !== r.id ? "opacity-40" : undefined}>
                  <td className="whitespace-nowrap pr-2">
                    <span className="inline-flex items-center gap-2">
                      <Image src={r.photo} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover" />
                      <span className="font-medium text-land-ink">{r.first}</span>
                    </span>
                  </td>
                  {r.dims.map((v, i) => (
                    <td
                      key={i}
                      className="h-9 rounded-lg text-center font-semibold tabular-nums"
                      style={heat(v)}
                    >
                      {fr(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11.5px] text-land-faint">
          <span>2</span>
          <span className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,oklch(0.7_0.18_38),oklch(0.95_0.03_80),oklch(0.52_0.2_265))]" />
          <span>4,5</span>
        </div>
      </Card>
    </div>
  );
}

function heat(v: number): React.CSSProperties {
  // Corail sous 2,8, neutre vers 3,2, bleu au-dessus : la carte se lit d'un
  // coup d'œil, chiffres compris.
  if (v < 2.8) return { background: `oklch(0.72 0.16 38 / ${0.25 + (2.8 - v) * 0.6})`, color: "oklch(0.35 0.12 36)" };
  if (v < 3.4) return { background: "oklch(0.95 0.03 80)", color: "var(--land-ink)" };
  const a = Math.min(1, 0.25 + (v - 3.4) * 0.75);
  return { background: `oklch(0.52 0.2 265 / ${a})`, color: a > 0.6 ? "white" : "oklch(0.3 0.15 265)" };
}

type Metric = { key: string; label: string; help: string; get: (r: Rep) => number; fmt: (v: number) => string; healthy?: (v: number) => boolean };

const ACTIVITY: Metric[] = [
  { key: "dur", label: "Durée de RDV", help: "Durée moyenne d'un rendez-vous.", get: (r) => r.avgDuration, fmt: (v) => `${Math.round(v)}${NB}min` },
  { key: "weekly", label: "Volume hebdo de RDV", help: "Nombre de rendez-vous par semaine sur la période.", get: (r) => r.weekly, fmt: (v) => fr(v) },
  { key: "total", label: "Volume total de RDV", help: "Nombre de rendez-vous sur toute la période.", get: (r) => r.calls, fmt: (v) => String(Math.round(v)) },
];
const INTERACTIONS: Metric[] = [
  { key: "talk", label: "Ratio parole / écoute", help: "Part du temps de parole prise par le commercial. En découverte, on vise 35-55 %.", get: (r) => r.talk, fmt: (v) => `${Math.round(v)}${NB}%`, healthy: (v) => v >= 35 && v <= 55 },
  { key: "mono", label: "Plus long monologue", help: "Plus longue prise de parole ininterrompue du commercial, en moyenne par call.", get: (r) => r.monologue, fmt: (v) => `${mmss(v)}${NB}min`, healthy: (v) => v < 120 },
  { key: "story", label: "Plus longue réponse prospect", help: "Plus elle est longue, plus le prospect s'est ouvert.", get: (r) => r.story, fmt: (v) => `${mmss(v)}${NB}min`, healthy: (v) => v > 60 },
  { key: "inter", label: "Score d'interactivité", help: "Vivacité de l'échange, sur 10 : fréquence des alternances de parole.", get: (r) => r.interactivity, fmt: (v) => fr(v), healthy: (v) => v >= 5 },
  { key: "pat", label: "Patience", help: "Blanc laissé avant de reprendre la parole. Trop court : on coupe le prospect.", get: (r) => r.patience, fmt: (v) => `${fr(v)}${NB}s`, healthy: (v) => v >= 0.8 },
  { key: "q", label: "Taux de questions", help: "Questions posées par heure de rendez-vous.", get: (r) => r.questions, fmt: (v) => fr(v), healthy: (v) => v >= 12 },
];

function Analytics({ rep }: { rep: Rep | null }) {
  const [family, setFamily] = useState<"interactions" | "activity">("interactions");
  const metrics = family === "activity" ? ACTIVITY : INTERACTIONS;
  const [key, setKey] = useState("talk");
  const metric = metrics.find((m) => m.key === key) ?? metrics[0];
  const team = mean(REPS.map(metric.get));
  const rows = [...REPS].sort((a, b) => metric.get(b) - metric.get(a));
  const max = Math.max(...rows.map(metric.get), team) * 1.08;
  const dot = (v: number, m: Metric) => (m.healthy ? (m.healthy(v) ? "bg-emerald-500" : "bg-amber-400") : "bg-land-accent");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-land-line bg-land-surface p-1">
        {(
          [
            ["interactions", "Interactions", Radio],
            ["activity", "Activité", Activity],
          ] as const
        ).map(([f, label, Icon]) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFamily(f);
              setKey((f === "activity" ? ACTIVITY : INTERACTIONS)[0].key);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              family === f ? "bg-land-accent-soft text-land-accent" : "text-land-muted hover:text-land-ink"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-land-line bg-land-surface">
        <div className={`grid grid-cols-2 divide-x divide-y divide-land-line border-b border-land-line ${family === "activity" ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-6"}`}>
          {metrics.map((m) => {
            const v = rep ? m.get(rep) : mean(REPS.map(m.get));
            const active = m.key === metric.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setKey(m.key)}
                title={m.help}
                className={`px-3.5 py-3.5 text-left transition-colors ${active ? "bg-land-accent-soft" : "hover:bg-land-sunken"}`}
              >
                <span className="flex items-center gap-1.5 text-[17px] font-semibold tabular-nums text-land-ink">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot(v, m)}`} />
                  {m.fmt(v)}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-tight text-land-muted">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-[13.5px] font-semibold text-land-ink">{metric.label}</div>
          <div className="mt-0.5 text-[12.5px] text-land-muted">{metric.help}</div>
          <div className="mt-4 text-right text-[11.5px] text-land-faint">Moyenne d&apos;équipe {metric.fmt(team)}</div>
          <ul className="mt-1.5 space-y-2.5">
            {rows.map((r) => {
              const v = metric.get(r);
              const dim = rep && rep.id !== r.id;
              return (
                <li key={r.id} className={`flex items-center gap-3 transition-opacity ${dim ? "opacity-35" : ""}`}>
                  <Image src={r.photo} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                  <span className="w-24 shrink-0 truncate text-[13px] text-land-ink sm:w-32">{r.name}</span>
                  <span className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums text-land-ink">{metric.fmt(v)}</span>
                  <span className="relative h-2 flex-1 rounded-full bg-land-sunken">
                    <span
                      className={`land-bar absolute inset-y-0 left-0 w-full rounded-full ${dot(v, metric)}`}
                      style={{ transform: `scaleX(${v / max})` }}
                    />
                    <span
                      className="absolute -top-1 bottom-[-4px] border-l border-dashed border-land-ink/50"
                      style={{ left: `${(team / max) * 100}%` }}
                      aria-hidden
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Objections({ rep }: { rep: Rep | null }) {
  const rows = rep
    ? rep.objections.filter(([, g, p, n]) => g + p + n > 0).map(([cat, good, part, none]) => ({ cat, good, part, none, reps: 1 }))
    : teamObjections();
  return (
    <Card title={rep ? `Objections rencontrées par ${rep.first}` : "Objections de l'équipe · 6 dernières semaines"}>
      <div className="mb-3 flex flex-wrap gap-4 text-[11.5px] text-land-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-land-accent" /> Bien traitée</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-land-accent/35" /> Partiellement</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-land-coral" /> Sans réponse</span>
      </div>
      <ul className="divide-y divide-land-line">
        {rows.map((o) => {
          const total = o.good + o.part + o.none;
          return (
            <li key={o.cat} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[13rem_minmax(0,1fr)_7rem]">
              <span className="text-[13.5px] font-medium text-land-ink">«{NB}{o.cat}{NB}»</span>
              <span className="text-right text-[12px] tabular-nums text-land-muted sm:order-3">
                {total} fois{!rep && ` · ${o.reps} comm.`}
              </span>
              <span className="col-span-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full sm:order-2 sm:col-span-1">
                <span className="bg-land-accent" style={{ width: `${(100 * o.good) / total}%` }} />
                <span className="bg-land-accent/35" style={{ width: `${(100 * o.part) / total}%` }} />
                <span className="bg-land-coral" style={{ width: `${(100 * o.none) / total}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-land-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-land-muted">
        <span className="font-medium text-land-ink">«{NB}Charge de déploiement{NB}», réponse de votre playbook{NB}:</span> chiffrer
        l&apos;effort (deux heures de paramétrage), citer un déploiement comparable. Les verbatims de chaque occurrence sont à
        un clic.
      </div>
    </Card>
  );
}

// Calls récents de l'équipe (Vue d'ensemble) — les mêmes que la liste des
// calls analysés de la page.
const RECENT: { title: string; rep: string; date: string; stage: string; score: number }[] = [
  { title: "Présentation Valdor Emballages", rep: "thomas", date: "2 oct.", stage: "R2", score: 3.4 },
  { title: "Découverte Lumen Logistique", rep: "julie", date: "1er oct.", stage: "R1", score: 4.1 },
  { title: "Découverte Hexa Transports", rep: "karim", date: "1er oct.", stage: "R1", score: 2.6 },
  { title: "Rencontre Studio Lin", rep: "lea", date: "30 sept.", stage: "R1", score: 3.5 },
  { title: "Closing Atelier Moreau", rep: "julie", date: "30 sept.", stage: "R3", score: 4.4 },
  { title: "Présentation Novaterm", rep: "thomas", date: "29 sept.", stage: "R2", score: 3.2 },
];

// ─── Le tableau de bord ─────────────────────────────────────────────────────

// Démonstration automatique : un curseur parcourt le tableau de bord et
// clique tout seul (un commercial, un onglet…) tant que le visiteur n'a pas
// pris la main. Il démarre quand le tableau est visible, s'arrête pour de bon
// dès que la vraie souris entre (ou au premier toucher), et n'existe pas en
// mouvement réduit. Le but : qu'on comprenne tout de suite que c'est cliquable.
type DemoStep = { target: string; run: () => void };

function useDemo(enabled: boolean, rootRef: React.RefObject<HTMLDivElement | null>, steps: DemoStep[]) {
  const [cursor, setCursor] = useState<{ x: number; y: number; click: number } | null>(null);
  const [active, setActive] = useState(false);
  const [stopped, setStopped] = useState(false);
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });

  // Visible à l'écran ? Mouvement réduit ?
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Seuil bas : sur le premier écran, seul le haut du tableau est visible,
    // et c'est justement là (avatars, onglets) que le curseur clique.
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && e.intersectionRatio > 0.15), {
      threshold: [0, 0.15, 0.5],
    });
    io.observe(root);
    const stop = (e: PointerEvent) => {
      if (e.type === "pointerenter" && e.pointerType !== "mouse") return;
      setStopped(true);
    };
    root.addEventListener("pointerenter", stop);
    root.addEventListener("pointerdown", stop);
    return () => {
      io.disconnect();
      root.removeEventListener("pointerenter", stop);
      root.removeEventListener("pointerdown", stop);
    };
  }, [enabled, rootRef]);

  useEffect(() => {
    if (!enabled || !active || stopped) return;
    const root = rootRef.current;
    if (!root) return;
    let i = 0;
    let timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const play = () => {
      const step = stepsRef.current[i % stepsRef.current.length];
      i += 1;
      const el = root.querySelector<HTMLElement>(`[data-demo="${step.target}"]`);
      const box = el?.getBoundingClientRect();
      if (!el || !box || box.width === 0) {
        later(play, 50);
        return;
      }
      const r = root.getBoundingClientRect();
      setCursor((c) => ({ x: box.left - r.left + box.width / 2, y: box.top - r.top + box.height / 2, click: c?.click ?? 0 }));
      later(() => {
        setCursor((c) => (c ? { ...c, click: c.click + 1 } : c));
        step.run();
      }, 950);
      later(play, 3000);
    };
    later(play, 700);
    return () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
  }, [enabled, active, stopped, rootRef]);

  return { cursor: enabled && !stopped ? cursor : null, stopped };
}

function FakeCursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
      style={{ transform: `translate(${x - 4}px, ${y - 3}px)` }}
    >
      <span key={click} className="land-click absolute -left-3 -top-3 h-8 w-8 rounded-full border-2 border-land-accent" />
      <svg width="22" height="24" viewBox="0 0 22 24" className="relative drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
        <path d="M2 1.5 L2 19 L6.6 14.8 L9.6 21.6 L12.6 20.3 L9.7 13.6 L16 13.4 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function PerformanceDashboard({ demo = false }: { demo?: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [who, setWho] = useState<string | null>(null);
  const rep = REPS.find((r) => r.id === who) ?? null;
  const rootRef = useRef<HTMLDivElement>(null);
  const { cursor, stopped } = useDemo(demo, rootRef, [
    { target: "rep-karim", run: () => setWho("karim") },
    { target: "tab-scores", run: () => setTab("scores") },
    { target: "tab-analytics", run: () => setTab("analytics") },
    { target: "rep-julie", run: () => setWho("julie") },
    { target: "tab-objections", run: () => setTab("objections") },
    { target: "rep-team", run: () => setWho(null) },
    { target: "tab-overview", run: () => setTab("overview") },
  ]);

  return (
    <div ref={rootRef} className="relative">
      {demo && (
        // Étiquette posée à cheval sur le bord haut : on la voit avant même
        // de lire le tableau.
        <div className="pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-land-surface px-3.5 py-2 text-[12.5px] font-medium text-land-ink shadow-[var(--land-shadow)] ring-1 ring-land-line">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-land-accent/60" />
              <span className="h-2 w-2 rounded-full bg-land-accent" />
            </span>
            <MousePointerClick className="h-3.5 w-3.5 text-land-accent" aria-hidden />
            {/* Version courte sur téléphone : l'étiquette ne doit jamais
                déborder de l'écran. */}
            <span className="sm:hidden">{stopped ? "À vous\u00a0: touchez un commercial" : "Démo interactive · touchez pour essayer"}</span>
            <span className="hidden sm:inline">
              {stopped ? "À vous\u00a0: cliquez sur un commercial ou un onglet" : "Démo interactive · cliquez sur un commercial ou un onglet"}
            </span>
          </span>
        </div>
      )}
      {cursor && <FakeCursor {...cursor} />}
    <div className="overflow-hidden rounded-[22px] border border-land-line bg-land-bg shadow-[var(--land-shadow-lg)]">
      <div className="flex">
        {/* Barre latérale de l'app : mêmes entrées, même ordre. */}
        <AppSidebar active="performance" note="12 calls analysés, 14 briefs prêts la veille." />

        <div className="min-w-0 flex-1">
          {/* En-tête : titre, sélecteur de commercial, période. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-land-line bg-land-surface px-4 py-3.5 sm:px-6">
            <div>
              <div className="text-[17px] font-semibold tracking-tight text-land-ink">Performance</div>
              <div className="text-[12px] text-land-muted">{rep ? `${rep.name} · ${rep.role}` : "Toute l'équipe · 4 commerciaux"}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-land-line bg-land-bg p-1" role="group" aria-label="Commercial affiché">
                <button
                  type="button"
                  data-demo="rep-team"
                  onClick={() => setWho(null)}
                  aria-pressed={!rep}
                  className={`h-8 rounded-full px-3 text-[12.5px] font-medium transition-colors ${!rep ? "bg-land-surface text-land-ink shadow-sm" : "text-land-muted hover:text-land-ink"}`}
                >
                  Équipe
                </button>
                {REPS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    data-demo={`rep-${r.id}`}
                    onClick={() => setWho(r.id)}
                    aria-pressed={rep?.id === r.id}
                    aria-label={r.name}
                    title={r.name}
                    className={`rounded-full p-0.5 transition-[box-shadow,transform] hover:scale-105 ${rep?.id === r.id ? "ring-2 ring-land-accent" : ""}`}
                  >
                    <Image src={r.photo} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                  </button>
                ))}
              </div>
              <span className="hidden rounded-full border border-land-line bg-land-bg px-3 py-1.5 text-[12px] text-land-muted sm:inline">
                6 dernières semaines
              </span>
            </div>
          </div>
          {/* Onglets Performance */}
          <div className="flex gap-1 overflow-x-auto border-b border-land-line bg-land-surface px-3 sm:px-5" role="tablist" aria-label="Statistiques">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                data-demo={`tab-${t.key}`}
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors ${
                  tab === t.key ? "text-land-accent" : "text-land-muted hover:text-land-ink"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
                {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-land-accent" />}
              </button>
            ))}
          </div>

          <div key={`${tab}-${who}`} className="land-swap min-h-[460px] p-3 sm:p-5 lg:min-h-[560px]" role="tabpanel">
            {rep && tab !== "objections" && <RepSummary rep={rep} />}
            {tab === "overview" && <Overview rep={rep} />}
            {tab === "scores" && <Scores rep={rep} />}
            {tab === "analytics" && <Analytics rep={rep} />}
            {tab === "objections" && <Objections rep={rep} />}
          </div>
        </div>
      </div>
      <div className="border-t border-land-line bg-land-surface px-5 py-2.5 text-[11.5px] text-land-faint">
        Exemple au format réel de Performance. Équipe, notes et objections fictives.
      </div>
    </div>
    </div>
  );
}

// Bandeau du commercial sélectionné : ce qu'il fait bien, ce qu'il doit
// travailler — calculé depuis sa grille, comme l'app.
function RepSummary({ rep }: { rep: Rep }) {
  const order = rep.dims.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  const best = order.slice(0, 2);
  const [wv, wi] = order[order.length - 1];
  const flag = order[order.length - 2][0] - wv > 0.3;
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex items-center gap-3 rounded-2xl border border-land-line bg-land-surface p-3 pr-5">
        <Image src={rep.photo} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
        <div>
          <div className="text-[14.5px] font-semibold text-land-ink">{rep.name}</div>
          <div className="text-[12px] text-land-muted">{rep.calls} calls analysés</div>
        </div>
      </div>
      <div className="rounded-2xl bg-land-accent-soft p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-land-accent">
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Ce qu&apos;{rep.she ? "elle" : "il"} fait bien
        </div>
        <div className="mt-1.5 text-[13px] text-land-ink">
          {best.map(([v, i]) => (
            <span key={i} className="mr-3 inline-block">
              {DIMENSIONS[i].label} <span className="font-semibold tabular-nums text-land-accent">{fr(v)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-land-coral-soft p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-land-coral-ink">
          <Target className="h-3.5 w-3.5" aria-hidden /> À travailler
        </div>
        <div className="mt-1.5 text-[13px] text-land-ink">
          {flag ? (
            <>
              {DIMENSIONS[wi].label} <span className="font-semibold tabular-nums text-land-coral-ink">{fr(wv)}</span>
            </>
          ) : (
            "Aucune dimension ne décroche nettement."
          )}
        </div>
      </div>
    </div>
  );
}
