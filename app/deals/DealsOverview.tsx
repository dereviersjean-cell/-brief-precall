"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/app/mes-deals/MesDealsView";
import { firstName } from "@/lib/deal-coaching";
import type { DealProgress, FocusStatus } from "@/lib/deal-progress";
import { PersonPhoto, type TeamPerson } from "./TeamCoachView";

// Onglet « Vue d'ensemble » de « Deals de l'équipe » (demande de Jean du
// 28/10/2026) : en arrivant, tous les deals en cours de l'équipe sur un seul
// tableau — qui le porte, où il en est, quand a eu lieu le dernier call, ce
// qui est prévu ensuite. Un clic ouvre la page du deal, où se lit le fil de
// ses calls.

const STATUS: Record<FocusStatus, { label: string; text: string; soft: string; dot: string }> = {
  relancer: {
    label: "À relancer",
    text: "#BE123C",
    soft: "#FFF1F2",
    dot: "#F43F5E",
  },
  traiter: {
    label: "À traiter",
    text: "#B45309",
    soft: "#FFFBEB",
    dot: "#F59E0B",
  },
  bonne_voie: {
    label: "En bonne voie",
    text: "#047857",
    soft: "#ECFDF5",
    dot: "#10B981",
  },
};
const ORDER: FocusStatus[] = ["relancer", "traiter", "bonne_voie"];

type Row = { deal: DealProgress; owner: TeamPerson };

function shortDay(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function ago(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  return "il y a plus d'un an";
}

function amount(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusPill({ status }: { status: FocusStatus }) {
  const s = STATUS[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ background: s.soft, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// Les calls du deal, du premier au dernier : un repère par call, plus foncé
// quand le call a levé plusieurs alertes.
function CallTrail({ deal }: { deal: DealProgress }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${deal.steps.length} call${deal.steps.length > 1 ? "s" : ""}`}>
      {deal.steps.map((s, i) => (
        <span key={s.callId} className="flex items-center gap-1">
          {i > 0 && <span className="h-px w-2 bg-stone-300" />}
          <span
            title={`R${i + 1}${s.callAt ? ` · ${shortDay(s.callAt)}` : ""}`}
            className={`grid h-5 min-w-[22px] place-items-center rounded px-1 text-[10.5px] font-bold ${
              s.alertCount > 2 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
            }`}
          >
            R{i + 1}
          </span>
        </span>
      ))}
    </div>
  );
}

function KnownBar({ known, total }: { known: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-stone-200">
        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${total ? (known / total) * 100 : 0}%` }} />
      </span>
      <span className="text-[12px] tabular-nums text-stone-600">
        {known}/{total}
      </span>
    </div>
  );
}

function NextStep({ deal }: { deal: DealProgress }) {
  const n = deal.nextStep;
  if (n.text) {
    const late = n.status === "en_retard" || n.status === "sans_suite";
    return (
      <>
        <p className="line-clamp-2 text-[12.5px] text-stone-800">{n.text}</p>
        {n.date && (
          <p className={`text-[11.5px] ${late ? "font-semibold text-rose-700" : "text-stone-500"}`}>
            {late ? `prévu le ${shortDay(n.date)}, dépassé` : `le ${shortDay(n.date)}`}
          </p>
        )}
      </>
    );
  }
  return <p className="text-[12.5px] text-stone-400">Aucune étape convenue</p>;
}

export default function DealsOverview({ people }: { people: TeamPerson[] }) {
  const router = useRouter();
  const [owner, setOwner] = useState<string | null>(null);
  const [status, setStatus] = useState<FocusStatus | null>(null);
  const [query, setQuery] = useState("");

  const all: Row[] = useMemo(() => people.flatMap((p) => p.deals.map((deal) => ({ deal, owner: p }))), [people]);
  const withDeals = people.filter((p) => p.deals.length > 0);

  // Les compteurs suivent le commercial choisi, pas le statut : cliquer sur
  // « À relancer » ne doit pas faire tomber les autres compteurs à zéro.
  const scoped = all.filter((r) => !owner || r.owner.id === owner);
  const q = query.trim().toLowerCase();
  const rows = scoped
    .filter((r) => !status || r.deal.focus.status === status)
    .filter((r) => !q || r.deal.name.toLowerCase().includes(q))
    .sort(
      (a, b) => ORDER.indexOf(a.deal.focus.status) - ORDER.indexOf(b.deal.focus.status) || (b.deal.lastCall.at ?? "").localeCompare(a.deal.lastCall.at ?? "")
    );
  const amounts = scoped.map((r) => r.deal.hubspot?.amount).filter((a): a is number => typeof a === "number");
  const calls = scoped.reduce((n, r) => n + r.deal.steps.length, 0);

  if (all.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">
        Aucun deal en cours dans l&apos;équipe : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <button
          onClick={() => setStatus(null)}
          className={`rounded-2xl bg-white p-4 text-left ring-1 ${status === null ? "ring-stone-900" : "ring-stone-200 hover:ring-stone-300"}`}
        >
          <p className="text-[12px] font-medium text-stone-500">Deals en cours</p>
          <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-stone-900">{scoped.length}</p>
          <p className="text-[11.5px] text-stone-500">
            {calls} call{calls > 1 ? "s" : ""}
            {amounts.length > 0 ? ` · ${amount(amounts.reduce((s, a) => s + a, 0))}` : ""}
          </p>
        </button>
        {ORDER.map((s) => {
          const count = scoped.filter((r) => r.deal.focus.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatus(status === s ? null : s)}
              className={`rounded-2xl bg-white p-4 text-left ring-1 ${status === s ? "ring-stone-900" : "ring-stone-200 hover:ring-stone-300"}`}
            >
              <p className="text-[12px] font-medium" style={{ color: STATUS[s].text }}>
                {STATUS[s].label}
              </p>
              <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-stone-900">{count}</p>
              <p className="text-[11.5px] text-stone-500">{scoped.length ? Math.round((count / scoped.length) * 100) : 0} % des deals</p>
            </button>
          );
        })}
        <div className="col-span-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200 lg:col-span-1">
          <p className="text-[12px] font-medium text-stone-500">Informations clés</p>
          <p className="mt-1 text-[26px] font-semibold tabular-nums tracking-[-0.02em] text-stone-900">
            {scoped.length ? Math.round((scoped.reduce((s, r) => s + r.deal.known / (r.deal.total || 1), 0) / scoped.length) * 100) : 0} %
          </p>
          <p className="text-[11.5px] text-stone-500">obtenues en moyenne</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          <button
            onClick={() => setOwner(null)}
            className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-medium ${owner === null ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"}`}
          >
            Toute l&apos;équipe
          </button>
          {withDeals.map((p) => (
            <button
              key={p.id}
              onClick={() => setOwner(owner === p.id ? null : p.id)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full pl-1 pr-3 text-[12.5px] font-medium ${
                owner === p.id ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              <PersonPhoto name={p.name} url={p.avatarUrl} size={28} />
              {firstName(p.name)} · {p.deals.length}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un deal"
          className="h-9 w-full rounded-full bg-white px-4 text-[13px] text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-stone-400 sm:w-56"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
        {rows.length === 0 ? (
          <p className="p-5 text-[13.5px] text-stone-500">Aucun deal ne correspond.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="stacked-table w-full text-left sm:min-w-[940px]">
              <thead>
                <tr className="whitespace-nowrap border-b border-stone-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                  <th className="px-4 py-3 font-semibold">Deal</th>
                  <th className="px-3 py-3 font-semibold">Commercial</th>
                  <th className="px-3 py-3 font-semibold">Calls</th>
                  <th className="px-3 py-3 font-semibold">Infos clés</th>
                  <th className="px-3 py-3 font-semibold">Dernier call</th>
                  <th className="px-3 py-3 font-semibold">Prochaine étape</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ deal, owner: person }) => (
                  <tr
                    key={deal.id}
                    onClick={() => router.push(`/deal/${deal.id}`)}
                    className="cursor-pointer border-b border-stone-100 align-middle last:border-0 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar d={deal} size={34} />
                        <div className="min-w-0">
                          <Link
                            href={`/deal/${deal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate text-[13.5px] font-semibold text-stone-900 hover:underline"
                          >
                            {deal.name}
                          </Link>
                          <p className="truncate text-[12px] text-stone-500">
                            {deal.hubspot?.stage ?? "Hors HubSpot"}
                            {deal.hubspot?.amount != null ? ` · ${amount(deal.hubspot.amount)}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3" data-label="Commercial">
                      <span className="flex items-center gap-2 text-[13px] text-stone-800">
                        <PersonPhoto name={person.name} url={person.avatarUrl} size={28} />
                        {firstName(person.name)}
                      </span>
                    </td>
                    <td className="px-3 py-3" data-label="Calls">
                      <CallTrail deal={deal} />
                    </td>
                    <td className="px-3 py-3" data-label="Infos clés">
                      <KnownBar known={deal.known} total={deal.total} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3" data-label="Dernier call">
                      <p className="text-[13px] text-stone-800">{deal.lastCall.at ? shortDay(deal.lastCall.at) : "—"}</p>
                      <p className="text-[11.5px] text-stone-500">{ago(deal.idleDays)}</p>
                    </td>
                    <td className="max-w-[240px] px-3 py-3" data-label="Prochaine étape">
                      <NextStep deal={deal} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={deal.focus.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
