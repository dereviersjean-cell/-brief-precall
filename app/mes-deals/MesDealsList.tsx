import Link from "next/link";
import { Avatar } from "./MesDealsView";
import { VERDICTS } from "./deal-ui";
import type { DealProgress } from "@/lib/deal-progress";

// « Mes deals », réduit à l'essentiel (demande de Jean du 02/11/2026 : « où en
// sont mes deals ? » en quelques secondes) : une ligne par deal en cours — le
// nom, l'étape, la date du dernier échange et un seul indicateur de santé.
// Rien d'autre pour l'instant ; on ajoutera si le besoin se confirme. Un clic
// ouvre la chronologie du deal, où sont le conseil et le détail.

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

function ago(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  return "il y a plus d'un an";
}

export default function MesDealsList({ deals }: { deals: DealProgress[] }) {
  if (deals.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">
        Aucun deal en cours : chaque call enregistré crée ou complète le deal de son prospect.
      </p>
    );
  }
  // Le plus récent en premier : ce qui bouge en ce moment se lit d'abord.
  const sorted = [...deals].sort((a, b) => (b.lastCall.at ?? "").localeCompare(a.lastCall.at ?? ""));
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
      <div className="hidden grid-cols-[minmax(0,1fr)_90px_150px_140px] gap-4 border-b border-stone-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500 sm:grid">
        <span>Deal</span>
        <span>Étape</span>
        <span>Dernier échange</span>
        <span>Santé</span>
      </div>
      <ul>
        {sorted.map((d) => {
          const v = VERDICTS[d.verdict];
          return (
            <li key={d.id} className="border-b border-stone-100 last:border-0">
              <Link
                href={`/deal/${d.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 hover:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_90px_150px_140px]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar d={d} size={34} />
                  <span className="truncate text-[14px] font-semibold text-stone-900">{d.name}</span>
                </span>
                <span className="text-[13px] font-semibold text-stone-700">R{d.steps.length}</span>
                <span className="text-[13px] text-stone-800">
                  {d.lastCall.at ? day(d.lastCall.at) : "—"}
                  {d.lastCall.at && <span className="ml-1.5 text-[12px] text-stone-400">{ago(d.idleDays)}</span>}
                </span>
                <span>
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${v.tone}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                    {v.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
