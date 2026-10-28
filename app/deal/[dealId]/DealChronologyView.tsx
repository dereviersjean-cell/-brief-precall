import Link from "next/link";
import { Avatar } from "@/app/mes-deals/MesDealsView";
import { FOCUS, VERDICTS, formatAmount } from "@/app/mes-deals/deal-ui";
import type { ChronoCall, ChronoPlanned, DealChronology, PlannedStatus } from "@/lib/deal-chronology";
import type { DealProgress } from "@/lib/deal-progress";
import { actionLabel } from "@/lib/deal-advice";

// La chronologie d'un deal (demande de Jean du 28/10/2026) : la page entre la
// vue d'ensemble et le détail. En haut, l'évolution sur un axe du temps — les
// informations clés qui montent call après call, les rendez-vous convenus et
// s'ils ont eu lieu, le silence depuis le dernier call. En dessous, le
// déroulé daté. Le détail call par call est sur /deal/<id>/detail.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const DAY = 24 * 60 * 60 * 1000;

const PLANNED: Record<Exclude<PlannedStatus, null>, { label: string; tone: string; fill: string }> = {
  held: { label: "A eu lieu", tone: "bg-emerald-50 text-emerald-700", fill: "#10B981" },
  missed: { label: "Pas de call à cette date", tone: "bg-rose-50 text-rose-700", fill: "#F43F5E" },
  upcoming: { label: "À venir", tone: "bg-blue-50 text-blue-700", fill: "#2A5CE0" },
};

function at(iso: string): number {
  return Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
}

function shortDay(iso: string): string {
  return new Date(at(iso)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

function longDay(iso: string): string {
  const text = new Date(at(iso)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

// L'axe du temps : la courbe des informations clés (en marches : elle ne
// bouge qu'à un call), les calls, les rendez-vous convenus, aujourd'hui.
function Chart({ chrono, now, inactivityDays }: { chrono: DealChronology; now: number; inactivityDays: number }) {
  if (!chrono.start || chrono.points.length === 0) return null;
  const W = 1000;
  const H = 230;
  const left = 36;
  const right = 24;
  const top = 18;
  const base = 150;
  const t0 = at(chrono.start) - 4 * DAY;
  const t1 = at(chrono.end) + 4 * DAY;
  const x = (t: number) => left + ((t - t0) / (t1 - t0)) * (W - left - right);
  const y = (known: number) => base - (known / (chrono.total || 1)) * (base - top);
  const pts = chrono.points;
  const last = pts[pts.length - 1];
  const lastX = x(at(last.date));
  const nowX = x(now);

  let path = `M ${x(at(pts[0].date))} ${base}`;
  for (let i = 0; i < pts.length; i++) {
    const px = x(at(pts[i].date));
    path += ` L ${px} ${i === 0 ? base : y(pts[i - 1].known)} L ${px} ${y(pts[i].known)}`;
  }
  path += ` L ${lastX} ${y(last.known)}`;
  const area = `${path} L ${lastX} ${base} Z`;

  // Un repère par mois sur l'axe.
  const months: { t: number; label: string }[] = [];
  const cursor = new Date(t0);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() < t1) {
    months.push({ t: cursor.getTime(), label: cursor.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const planned = chrono.events.filter((e): e is ChronoPlanned => e.kind === "planned" && e.status !== null);
  const silent = chrono.silenceDays !== null && chrono.silenceDays > inactivityDays;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[720px]" role="img" aria-label="Évolution du deal dans le temps">
        {[0, Math.round(chrono.total / 2), chrono.total].map((v) => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v === 0 ? undefined : "3 4"} />
            <text x={left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">
              {v}
            </text>
          </g>
        ))}
        {months.map((m) => (
          <g key={m.t}>
            <line x1={x(m.t)} x2={x(m.t)} y1={base} y2={base + 5} stroke="#cbd5e1" />
            <text x={x(m.t)} y={H - 6} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {m.label}
            </text>
          </g>
        ))}

        {/* Le silence depuis le dernier call, au-delà du délai d'inactivité. */}
        {silent && nowX > lastX && (
          <g>
            <rect x={lastX} y={top} width={nowX - lastX} height={base - top} fill="#fff1f2" />
            <text x={(lastX + nowX) / 2} y={top + 16} textAnchor="middle" fontSize="12" fontWeight="600" fill="#be123c">
              {chrono.silenceDays} jours sans call
            </text>
          </g>
        )}

        <path d={area} fill="#2A5CE0" fillOpacity="0.08" />
        <path d={path} fill="none" stroke="#2A5CE0" strokeWidth="2.5" strokeLinejoin="round" />
        {nowX > lastX && (
          <line x1={lastX} x2={nowX} y1={y(last.known)} y2={y(last.known)} stroke="#2A5CE0" strokeWidth="2" strokeDasharray="4 5" strokeOpacity="0.5" />
        )}

        {pts.map((p) => (
          <text
            key={`k${p.rank}`}
            x={x(at(p.date))}
            y={Math.min(y(p.known) - 8, base - 20)}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="600"
            fill="#1e3a8a"
          >
            {p.known}/{chrono.total}
          </text>
        ))}

        <line x1={nowX} x2={nowX} y1={top - 6} y2={base + 26} stroke="#0f172a" strokeDasharray="2 3" />
        <text x={nowX} y={top - 8} textAnchor={nowX > W - 80 ? "end" : "middle"} fontSize="11" fontWeight="600" fill="#0f172a">
          Aujourd&apos;hui
        </text>

        {planned.map((p, i) => {
          const px = x(at(p.date));
          return (
            <g key={`p${i}`}>
              <title>{`${shortDay(p.date)} · ${p.text} — ${PLANNED[p.status as Exclude<PlannedStatus, null>].label}`}</title>
              <rect
                x={px - 5}
                y={base + 13}
                width="10"
                height="10"
                transform={`rotate(45 ${px} ${base + 18})`}
                fill={PLANNED[p.status as Exclude<PlannedStatus, null>].fill}
              />
            </g>
          );
        })}

        {pts.map((p) => {
          const px = x(at(p.date));
          return (
            <g key={`c${p.rank}`}>
              <circle cx={px} cy={base} r="13" fill="#0f172a" />
              <text x={px} y={base + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
                R{p.rank}
              </text>
              <text x={px} y={base + 44} textAnchor="middle" fontSize="11" fill="#475569">
                {shortDay(p.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#2A5CE0]" /> informations clés obtenues
        </span>
        {(["held", "missed", "upcoming"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rotate-45" style={{ background: PLANNED[s].fill }} /> rendez-vous convenu · {PLANNED[s].label.toLowerCase()}
          </span>
        ))}
      </p>
    </div>
  );
}

function CallRow({ e, total, dealId }: { e: ChronoCall; total: number; dealId: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[14.5px] font-semibold text-slate-900">
          R{e.rank}
          {e.durationMinutes ? <span className="font-normal text-slate-500"> · {e.durationMinutes} min</span> : null}
          {e.score != null ? <span className="font-normal text-slate-500"> · score {e.score.toFixed(1).replace(".", ",")}/5</span> : null}
        </p>
        <Link href={`/deal/${dealId}/detail#call-${e.rank}`} className="text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
          Le détail de ce call →
        </Link>
      </div>
      <p className="mt-1.5 text-[13.5px] text-slate-800">
        {e.gained > 0 ? (
          <>
            <span className="font-semibold text-emerald-700">
              +{e.gained} information{e.gained > 1 ? "s" : ""} clé{e.gained > 1 ? "s" : ""}
            </span>{" "}
            : {list(e.obtained)}{" "}
            <span className="text-slate-500">
              ({e.known}/{total})
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold text-slate-600">{e.rank === 1 ? "Aucune information clé confirmée" : "Aucune nouvelle information clé"}</span>{" "}
            <span className="text-slate-500">
              ({e.known}/{total})
            </span>
          </>
        )}
      </p>
      {e.stillVague.length > 0 && <p className="mt-1 text-[13px] text-slate-600">Encore flou : {list(e.stillVague)}</p>}
      {e.blocker && (
        <p className="mt-1 text-[13px] text-slate-600">
          <span className="font-medium text-amber-700">Ce qui a coincé :</span> {e.blocker}
        </p>
      )}
      {e.alerts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.alerts.map((a) => (
            <span key={a} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-800">
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PlannedRow({ e }: { e: ChronoPlanned }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-[13px] text-slate-600">
      <span className="text-slate-400">◇</span>
      <span>
        Prévu au R{e.fromRank} : <span className="text-slate-800">{e.text}</span>
      </span>
      {e.status && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLANNED[e.status].tone}`}>
          {e.status === "held" && e.heldByRank ? `A eu lieu · R${e.heldByRank}` : PLANNED[e.status].label}
        </span>
      )}
    </div>
  );
}

export default function DealChronologyView({
  dealId,
  progress,
  chrono,
  owners,
  now,
  inactivityDays,
  backHref,
  backLabel,
}: {
  dealId: string;
  progress: DealProgress;
  chrono: DealChronology;
  owners: Record<string, string>;
  now: number;
  inactivityDays: number;
  backHref: string;
  backLabel: string;
}) {
  const v = VERDICTS[progress.verdict];
  const f = FOCUS[progress.focus.status];
  const hs = progress.hubspot;
  const calls = chrono.events.filter((e): e is ChronoCall => e.kind === "call");
  const first = calls[0];
  const spanDays = chrono.start && chrono.points.length > 1 ? Math.round((at(chrono.points[chrono.points.length - 1].date) - at(chrono.start)) / DAY) : null;
  const silent = chrono.silenceDays !== null && chrono.silenceDays > inactivityDays;
  const todayIso = new Date(now).toISOString();

  // Le déroulé, regroupé par jour.
  const byDay: { day: string | null; items: typeof chrono.events }[] = [];
  for (const e of chrono.events) {
    const day = e.date ? e.date.slice(0, 10) : null;
    const lastGroup = byDay[byDay.length - 1];
    if (lastGroup && lastGroup.day === day) lastGroup.items.push(e);
    else byDay.push({ day, items: [e] });
  }
  const pastGroups = byDay.filter((g) => !g.day || at(g.day) <= now);
  const futureGroups = byDay.filter((g) => g.day && at(g.day) > now);

  const facts = [
    chrono.start ? { label: "Premier call", value: shortDay(chrono.start), tone: "" } : null,
    { label: "Calls", value: `${calls.length}${spanDays ? ` en ${spanDays} jours` : ""}`, tone: "" },
    { label: "Informations clés", value: `${first ? first.known : 0} → ${progress.known}/${progress.total}`, tone: "" },
    chrono.silenceDays !== null
      ? { label: "Dernier call", value: chrono.silenceDays === 0 ? "aujourd'hui" : `il y a ${chrono.silenceDays} jours`, tone: silent ? "text-rose-700" : "" }
      : null,
  ].filter((x): x is { label: string; value: string; tone: string } => x !== null);

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900">
        ← {backLabel}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar d={progress} size={46} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-slate-900">{progress.name}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${f.tone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} />
                {f.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${v.tone}`}>{v.label}</span>
            </div>
            <p className="mt-1 text-[13px] text-slate-500">
              {[Object.values(owners).join(", "), hs?.stage ? `HubSpot · ${hs.stage}` : "Hors HubSpot", hs?.amount != null ? formatAmount(hs.amount) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <Link
          href={`/deal/${dealId}/detail`}
          className="brand-gradient inline-flex h-10 shrink-0 items-center justify-center rounded-full px-5 text-[13.5px] font-semibold text-white hover:brightness-110"
        >
          Voir le détail du deal →
        </Link>
      </header>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-border bg-white px-4 py-3">
            <dt className="text-[12px] text-slate-500">{fact.label}</dt>
            <dd className={`mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-slate-900 ${fact.tone}`}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h2 className={`${LABEL} mb-4`}>L&apos;évolution du deal</h2>
        <Chart chrono={chrono} now={now} inactivityDays={inactivityDays} />
      </section>

      <section>
        <h2 className="mb-4 text-[18px] font-semibold tracking-[-0.02em] text-slate-900">Le déroulé</h2>
        <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200 sm:before:left-[125px]">
          {[...pastGroups, { day: todayIso.slice(0, 10), items: [], today: true } as const, ...futureGroups].map((g, i) => {
            const isToday = "today" in g;
            return (
              <li key={i} className="relative grid grid-cols-1 gap-2 pl-6 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-8 sm:pl-0">
                <span
                  className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-[color:var(--background)] sm:left-[120px] ${
                    isToday ? "bg-slate-900" : g.items.some((e) => e.kind === "call") ? "bg-[#2A5CE0]" : "bg-slate-300"
                  }`}
                />
                <p className={`text-[12.5px] sm:pt-0.5 sm:text-right ${isToday ? "font-semibold text-slate-900" : "font-medium text-slate-500"}`}>
                  {isToday ? "Aujourd'hui" : g.day ? longDay(g.day) : "Date inconnue"}
                </p>
                <div className="space-y-2 sm:pl-6">
                  {isToday ? (
                    <div className={`rounded-2xl border p-4 ${silent ? "border-rose-200 bg-rose-50/60" : "border-border bg-white"}`}>
                      <p className={`text-[13.5px] font-semibold ${silent ? "text-rose-800" : "text-slate-900"}`}>
                        {chrono.silenceDays !== null && chrono.silenceDays > 0 ? `${chrono.silenceDays} jours sans call · ` : ""}
                        {actionLabel(progress)}
                      </p>
                      {progress.focus.detail && <p className="mt-0.5 text-[13px] text-slate-600">{progress.focus.detail}</p>}
                      <Link href={`/deal/${dealId}/detail`} className="mt-2 inline-block text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
                        Ce qu&apos;il faut aller chercher au prochain call →
                      </Link>
                    </div>
                  ) : (
                    g.items.map((e, j) => (e.kind === "call" ? <CallRow key={j} e={e} total={chrono.total} dealId={dealId} /> : <PlannedRow key={j} e={e} />))
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex justify-center pt-2">
        <Link
          href={`/deal/${dealId}/detail`}
          className="inline-flex h-10 items-center rounded-full px-5 text-[13.5px] font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-white"
        >
          Voir le détail du deal →
        </Link>
      </div>
    </div>
  );
}
