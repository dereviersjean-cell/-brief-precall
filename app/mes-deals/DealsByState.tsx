import Link from "next/link";
import DealAvatar from "@/app/components/DealAvatar";
import { StateChip } from "./deal-ui";
import { actionLabel } from "@/lib/deal-advice";
import type { DealProgress, DealState } from "@/lib/deal-progress";

// « Mes deals » (maquette B choisie par Jean le 14/11/2026) : quatre chiffres,
// puis les deals regroupés par état, celui qui demande le plus d'attention
// d'abord. Chaque carte dit où en est le deal et la prochaine action.

const GROUPS: { title: string; states: DealState[] }[] = [
  { title: "À traiter d'abord", states: ["recul"] },
  { title: "À relancer", states: ["relancer"] },
  { title: "En progrès", states: ["progres"] },
  { title: "À l'arrêt ou à qualifier", states: ["arret", "qualifier"] },
];

const euros = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export type DealsSummary = { count: number; amount: number; stalled: number; upcomingMeetings: number };

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-stone-200">
      <p className="text-[24px] font-semibold tracking-[-0.02em] text-stone-900">{value}</p>
      <p className="text-[13px] leading-snug text-stone-500">{label}</p>
    </div>
  );
}

export default function DealsByState({ deals, summary }: { deals: DealProgress[]; summary: DealsSummary }) {
  if (deals.length === 0) {
    return <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">Aucun deal en cours : chaque rendez-vous enregistré crée ou complète le deal de son prospect.</p>;
  }
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={summary.count} label="deals en cours" />
        <Stat value={euros(summary.amount)} label="montant total en cours (HubSpot)" />
        <Stat value={summary.stalled} label="deals à l'arrêt ou en recul" />
        <Stat value={summary.upcomingMeetings} label="rendez-vous dans les 7 jours" />
      </div>

      {GROUPS.map((group) => {
        const list = deals.filter((d) => group.states.includes(d.state));
        if (list.length === 0) return null;
        return (
          <section key={group.title}>
            <h2 className="text-[17px] font-semibold text-stone-900">
              {group.title} <span className="text-[14px] font-medium text-stone-500">· {list.length}</span>
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((d) => (
                <li key={d.id} className="min-w-0">
                  <Link href={`/deal/${d.id}`} className="flex h-full flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-stone-200 transition hover:ring-stone-300">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <DealAvatar d={{ name: d.name, domain: d.domain }} size={34} />
                        <span className="truncate text-[14.5px] font-semibold text-stone-900">{d.name}</span>
                      </span>
                      <StateChip state={d.state} />
                    </span>
                    <span className="text-[12.5px] text-stone-500">
                      R{d.steps.length} · {d.hubspot?.stage ?? "étape à confirmer"}
                      {typeof d.hubspot?.amount === "number" && ` · ${euros(d.hubspot.amount)}`}
                    </span>
                    <span className="text-[13.5px] leading-snug text-stone-800">{actionLabel(d)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
