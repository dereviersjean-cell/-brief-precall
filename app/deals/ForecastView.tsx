"use client";

import Link from "next/link";
import { useState } from "react";
import PersonPhoto from "@/app/components/PersonPhoto";
import { inPeriod, type ForecastDeal, type ForecastPeriod, type ForecastPerson, type ForecastTotals } from "@/lib/deal-forecast";

// Suivi des deals, onglet « Prévision » (maquette C1 choisie par Jean le
// 10/11/2026, avec les totaux en haut) : ce que l'équipe devrait signer sur
// la période d'après HubSpot et d'après les calls, puis une ligne par
// commercial qu'on déplie pour voir ses deals.

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const GRID = "grid grid-cols-[minmax(0,1fr)_84px_24px] items-center gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_110px_110px_110px_minmax(0,1fr)_24px] md:gap-4";

function Card({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "muted" | "warn" }) {
  const box = tone === "warn" ? "border-amber-200 bg-amber-50" : "border-border bg-white";
  const text = tone === "warn" ? "text-amber-900" : tone === "muted" ? "text-slate-500" : "text-slate-900";
  return (
    <div className={`rounded-2xl border p-5 ${box}`}>
      <p className={`text-[13px] ${tone === "warn" ? "text-amber-900" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-[30px] font-bold tracking-tight ${text}`}>{value}</p>
      <p className={`mt-1 text-[13px] ${tone === "warn" ? "text-amber-900" : "text-slate-500"}`}>{detail}</p>
    </div>
  );
}

function Confirmed({ t }: { t: ForecastTotals }) {
  const pct = t.hubspot > 0 ? Math.round((t.brief / t.hubspot) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[color:var(--primary)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-[13px] font-semibold text-slate-900">{pct} %</span>
    </div>
  );
}

function DealRow({ d, today }: { d: ForecastDeal; today: string }) {
  const overdue = d.closeDate < today;
  const day = new Date(`${d.closeDate}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <li className="grid grid-cols-1 gap-x-4 gap-y-1 py-3 text-[13.5px] md:grid-cols-[minmax(0,1fr)_90px_110px_minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
      <div className="min-w-0">
        <Link href={`/deal/${d.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
          {d.name}
        </Link>
        <span className={`text-[12.5px] ${overdue ? "text-orange-800" : "text-slate-500"}`}>{overdue ? `clôture prévue le ${day}, dépassée` : `clôture le ${day}`}</span>
      </div>
      <span className="text-slate-900 md:text-right">{eur(d.amount)}</span>
      <span>
        <span className="text-slate-500">{d.hubspotPct} %</span> → <strong className={d.briefPct < 30 ? "text-orange-800" : "text-[color:var(--violet)]"}>{d.briefPct} %</strong>
      </span>
      <span className="text-slate-600">{d.why}</span>
      <span className="font-medium text-slate-900">{d.ask}</span>
    </li>
  );
}

function PersonRow({ p, period, today, defaultOpen }: { p: ForecastPerson; period: ForecastPeriod; today: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { deals, totals } = inPeriod(p, period);
  return (
    <div className={`border-t border-border ${open ? "bg-[color:var(--lavender)]/40" : ""}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} disabled={deals.length === 0} className={`${GRID} w-full px-4 py-4 text-left text-[14.5px] sm:px-6`}>
        <span className="flex min-w-0 items-center gap-3">
          <PersonPhoto name={p.name} url={p.avatarUrl} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900">{p.name}</span>
            <span className="block text-[12.5px] text-slate-500 md:hidden">
              {totals.count} deal{totals.count > 1 ? "s" : ""} · HubSpot {eur(totals.hubspot)}
            </span>
          </span>
        </span>
        <span className="hidden text-[13.5px] text-slate-500 md:block">
          {totals.count === 0 ? "Aucun deal sur la période" : `${totals.count} deal${totals.count > 1 ? "s" : ""} · ${eur(totals.pipeline)}`}
        </span>
        <span className="hidden text-right text-slate-500 md:block">{eur(totals.hubspot)}</span>
        <span className="text-right font-bold text-slate-900">{eur(totals.brief)}</span>
        <span className="hidden text-right font-semibold text-amber-800 md:block">{eur(totals.hubspot - totals.brief)}</span>
        <span className="hidden md:block">{totals.count > 0 && <Confirmed t={totals} />}</span>
        <span className="text-[12px] text-slate-500" aria-hidden>
          {deals.length === 0 ? "" : open ? "▲" : "▼"}
        </span>
      </button>
      {open && deals.length > 0 && (
        <ul className="divide-y divide-border px-4 pb-2 sm:px-6 md:pl-[64px]">
          <li className="hidden grid-cols-[minmax(0,1fr)_90px_110px_minmax(0,1.3fr)_minmax(0,1fr)] gap-x-4 py-2 text-[12px] font-semibold text-slate-500 md:grid">
            <span>Deal</span>
            <span className="text-right">Montant</span>
            <span>HubSpot → Brief</span>
            <span>Pourquoi</span>
            <span>À lui demander</span>
          </li>
          {deals.map((d) => (
            <DealRow key={d.id} d={d} today={today} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ForecastView({ people, periods, today, hasTeam }: { people: ForecastPerson[]; periods: ForecastPeriod[]; today: string; hasTeam: boolean }) {
  const [key, setKey] = useState<ForecastPeriod["key"]>("month");
  const period = periods.find((p) => p.key === key) ?? periods[0];
  const rows = people.map((p) => ({ p, ...inPeriod(p, period) })).sort((a, b) => b.totals.hubspot - b.totals.brief - (a.totals.hubspot - a.totals.brief));
  const team = rows.reduce(
    (t, r) => ({
      count: t.count + r.totals.count,
      pipeline: t.pipeline + r.totals.pipeline,
      hubspot: t.hubspot + r.totals.hubspot,
      brief: t.brief + r.totals.brief,
      signed: t.signed + r.totals.signed,
    }),
    { count: 0, pipeline: 0, hubspot: 0, brief: 0, signed: 0 }
  );
  const uncounted = people.reduce((n, p) => n + p.uncounted, 0);
  const firstOpen = rows.find((r) => r.deals.length > 0)?.p.id;

  if (!hasTeam) {
    return (
      <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-500">
        Aucun commercial ne vous est rattaché : la prévision porte sur les deals de votre équipe.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-bold text-slate-900">{period.title}</h2>
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setKey(p.key)}
              aria-pressed={p.key === key}
              className={`h-9 rounded-full border px-4 text-[13px] ${p.key === key ? "border-[color:var(--primary)] bg-[color:var(--lavender)] font-semibold text-[color:var(--violet)]" : "border-border bg-white font-medium text-slate-600 hover:text-slate-900"}`}
            >
              {p.button}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card label="Atterrissage prévu par Brief" value={eur(team.signed + team.brief)} detail={`${eur(team.signed)} déjà signés + ${eur(team.brief)} attendus sur ${team.count} deal${team.count > 1 ? "s" : ""}`} />
        <Card label="Ce que dit HubSpot" value={eur(team.signed + team.hubspot)} detail={`${eur(team.signed)} signés + ${eur(team.hubspot)} d'après l'étape de chaque deal`} tone="muted" />
        <Card label="Écart" value={eur(team.hubspot - team.brief)} detail="Ce que HubSpot compte et que les calls ne confirment pas" tone="warn" />
      </div>

      {team.count === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-500">
          Aucun deal de l&apos;équipe n&apos;a de clôture prévue sur cette période dans HubSpot.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className={`${GRID} px-4 py-3 text-[12.5px] font-semibold text-slate-500 sm:px-6`}>
            <span>Commercial</span>
            <span className="hidden md:block">Deals en cours</span>
            <span className="hidden text-right md:block">HubSpot</span>
            <span className="text-right">Brief</span>
            <span className="hidden text-right md:block">Écart</span>
            <span className="hidden md:block">Part confirmée par les calls</span>
            <span />
          </div>
          {rows.map((r) => (
            <PersonRow key={`${r.p.id}-${period.key}`} p={r.p} period={period} today={today} defaultOpen={r.p.id === firstOpen} />
          ))}
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-slate-500">
        HubSpot : montant × probabilité de l&apos;étape. Brief : la même probabilité, abaissée quand les calls ne la confirment pas (clôture dépassée, suite non tenue, décideur ou budget
        non confirmés).
        {uncounted > 0 &&
          ` ${uncounted} deal${uncounted > 1 ? "s" : ""} en cours ${uncounted > 1 ? "ne sont pas comptés" : "n'est pas compté"} : pas de deal HubSpot, de montant ou de date de clôture.`}
      </p>
    </div>
  );
}
