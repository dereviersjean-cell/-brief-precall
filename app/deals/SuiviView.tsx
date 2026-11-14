"use client";

import Link from "next/link";
import { useState } from "react";
import DealAvatar from "@/app/components/DealAvatar";
import PersonPhoto from "@/app/components/PersonPhoto";
import { StateChip } from "@/app/mes-deals/deal-ui";
import { firstName } from "@/lib/deal-coaching";
import type { SuiviDeal, SuiviKind } from "@/lib/deal-suivi";
import type { TeamPerson } from "./team";

// Suivi des deals par priorité (maquette A choisie par Jean le 14/11/2026,
// règles d'Hubert) : les deals qui demandent l'intervention du manager, chacun
// avec le problème, l'action recommandée et la question à poser ; les deals
// endormis à part ; tous les deals de l'équipe dans un second onglet.

const KINDS: Record<Exclude<SuiviKind, "endormi">, { label: string; tone: string; order: number }> = {
  degradation: { label: "Dégradation", tone: "bg-rose-50 text-rose-700", order: 0 },
  engagement: { label: "Engagement non tenu", tone: "bg-rose-50 text-rose-700", order: 1 },
  blocage: { label: "Blocage", tone: "bg-amber-50 text-amber-700", order: 2 },
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const euros = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—";
}

const meta = (d: SuiviDeal) => [`R${d.rank}`, d.stage ?? "étape à confirmer", d.amount !== null ? euros(d.amount) : null].filter(Boolean).join(" · ");

function Stat({ value, label, tone = "text-slate-900" }: { value: string | number; label: string; tone?: string }) {
  return (
    <div className="min-w-0 flex-1 basis-44 rounded-2xl border border-border bg-white px-4 py-3.5">
      <p className={`text-[24px] font-semibold tracking-[-0.02em] ${tone}`}>{value}</p>
      <p className="text-[13px] leading-snug text-slate-500">{label}</p>
    </div>
  );
}

function AlertCard({ d }: { d: SuiviDeal }) {
  const kind = KINDS[d.kind as Exclude<SuiviKind, "endormi">];
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <DealAvatar d={d} size={34} />
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-semibold text-slate-900">
              <Link href={`/deal/${d.id}`} className="hover:underline">
                {d.name}
              </Link>{" "}
              <span className="text-[13.5px] font-medium text-slate-500">· {firstName(d.owner)}</span>
            </h3>
            <p className="text-[12.5px] text-slate-500">{meta(d)}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${kind.tone}`}>{kind.label}</span>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-snug sm:grid-cols-[150px_minmax(0,1fr)]">
        <dt className={`${LABEL} pt-0.5`}>Le problème</dt>
        <dd className="text-slate-700">{d.problem}</dd>
        <dt className={`${LABEL} pt-0.5`}>Action recommandée</dt>
        <dd className="font-semibold text-slate-900">{d.action}</dd>
      </dl>
      {d.questions.length > 0 && (
        <div className="mt-3 rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">À demander à {firstName(d.owner)}</p>
          {d.questions.map((q) => (
            <p key={q} className="mt-0.5 text-[14px] font-medium leading-snug text-slate-900">
              {q}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

function Sleeping({ deals }: { deals: SuiviDeal[] }) {
  if (deals.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)]">
      <h2 className="text-[16px] font-semibold text-slate-900">
        Deals endormis <span className="text-[13.5px] font-medium text-slate-500">· {deals.length}</span>
      </h2>
      <p className="mt-0.5 text-[13px] text-slate-500">À relancer ou à clôturer. Ils ne demandent pas forcément votre intervention.</p>
      <ul className="mt-2 divide-y divide-slate-100">
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/deal/${d.id}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 hover:bg-slate-50">
              <span className="min-w-0">
                <span className="text-[14px] font-semibold text-slate-900">{d.name}</span> <span className="text-[13px] text-slate-500">· {firstName(d.owner)}</span>
                <span className="block text-[12.5px] text-slate-500">{meta(d)}</span>
              </span>
              <span className="whitespace-nowrap text-[13px] text-slate-600">{d.idleDays} jours sans échange</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AllDeals({ deals, people }: { deals: SuiviDeal[]; people: TeamPerson[] }) {
  const photo = new Map(people.map((p) => [p.name, p.avatarUrl]));
  const sorted = [...deals].sort((a, b) => (b.lastCallAt ?? "").localeCompare(a.lastCallAt ?? ""));
  const columns = "sm:grid-cols-[minmax(0,1.3fr)_150px_120px_minmax(0,1fr)_110px]";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className={`hidden gap-4 border-b border-slate-100 px-5 py-3 ${LABEL} sm:grid ${columns}`}>
        <span>Deal</span>
        <span>Commercial</span>
        <span>État</span>
        <span>Étape</span>
        <span>Dernier échange</span>
      </div>
      <ul>
        {sorted.map((d) => (
          <li key={d.id} className="border-b border-slate-100 last:border-0">
            <Link href={`/deal/${d.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3 hover:bg-slate-50 ${columns}`}>
              <span className="flex min-w-0 items-center gap-3">
                <DealAvatar d={d} size={34} />
                <span className="truncate text-[14px] font-semibold text-slate-900">{d.name}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-slate-800">
                <PersonPhoto name={d.owner} url={photo.get(d.owner) ?? null} size={28} />
                <span className="truncate">{firstName(d.owner)}</span>
              </span>
              <span>
                <StateChip state={d.state} />
              </span>
              <span className="truncate text-[13px] text-slate-600">
                R{d.rank} · {d.stage ?? "étape à confirmer"}
              </span>
              <span className="text-[13px] text-slate-600">{day(d.lastCallAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SuiviView({ deals, people, hasTeam }: { deals: SuiviDeal[]; people: TeamPerson[]; hasTeam: boolean }) {
  const [view, setView] = useState<"reprendre" | "tous">("reprendre");
  if (deals.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-500">
        {hasTeam
          ? "Aucun deal en cours dans l'équipe : chaque rendez-vous enregistré crée ou complète le deal de son prospect."
          : "Aucun commercial ne vous est rattaché : rattachez votre équipe dans Paramètres › Équipe pour suivre ses deals."}
      </p>
    );
  }
  const alerts = deals
    .filter((d) => d.kind && d.kind !== "endormi")
    .sort((a, b) => KINDS[a.kind as "blocage"].order - KINDS[b.kind as "blocage"].order || (b.amount ?? 0) - (a.amount ?? 0));
  const sleeping = deals.filter((d) => d.kind === "endormi").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const atStake = alerts.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const tab = (key: typeof view, label: string, count: number) => (
    <button
      role="tab"
      aria-selected={view === key}
      onClick={() => setView(key)}
      className={`-mb-px border-b-2 px-3.5 py-2.5 text-[14px] ${view === key ? "border-[color:var(--violet)] font-semibold text-[color:var(--violet)]" : "border-transparent text-slate-500 hover:text-slate-900"}`}
    >
      {label} <span className="font-medium">· {count}</span>
    </button>
  );
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Vues du suivi" className="flex flex-wrap gap-1 border-b border-border">
        {tab("reprendre", "À reprendre", alerts.length)}
        {tab("tous", "Tous les deals", deals.length)}
      </div>
      {view === "tous" ? (
        <AllDeals deals={deals} people={people} />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Stat value={alerts.length} label={alerts.length > 1 ? "deals demandent votre intervention" : "deal demande votre intervention"} tone={alerts.length > 0 ? "text-rose-700" : "text-slate-900"} />
            <Stat value={sleeping.length} label={sleeping.length > 1 ? "deals endormis" : "deal endormi"} />
            <Stat value={euros(atStake)} label="en jeu sur les deals à reprendre" />
          </div>
          {alerts.length === 0 && <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-600">Aucun deal ne demande votre intervention.</p>}
          {alerts.map((d) => (
            <AlertCard key={d.id} d={d} />
          ))}
          <Sleeping deals={sleeping} />
        </>
      )}
    </div>
  );
}
