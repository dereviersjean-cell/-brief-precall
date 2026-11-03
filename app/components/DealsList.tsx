import Link from "next/link";
import DealAvatar from "@/app/components/DealAvatar";
import { VERDICTS } from "@/app/mes-deals/deal-ui";
import PersonPhoto from "@/app/components/PersonPhoto";
import { firstName } from "@/lib/deal-coaching";
import type { DealProgress } from "@/lib/deal-progress";

// La liste des deals en cours, réduite à l'essentiel (demande de Jean du
// 02/11/2026 : comprendre en quelques secondes où en sont les deals) : une
// ligne par deal — le nom, l'étape, la date du dernier échange et un seul
// indicateur de santé ; côté manager, le commercial en plus. Rien d'autre pour
// l'instant, on ajoutera si le besoin se confirme. Un clic ouvre la
// chronologie du deal, où sont le conseil et le détail. Partagée par « Mes
// deals » et la vue d'ensemble de « Deals de l'équipe ».

export type DealsListRow = { deal: DealProgress; owner?: { name: string; avatarUrl: string | null } };

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

export default function DealsList({ rows, emptyText }: { rows: DealsListRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-white p-5 text-[13.5px] text-stone-500 ring-1 ring-stone-200">{emptyText}</p>;
  }
  const withOwner = rows.some((r) => r.owner);
  // Le plus récent en premier : ce qui bouge en ce moment se lit d'abord.
  const sorted = [...rows].sort((a, b) => (b.deal.lastCall.at ?? "").localeCompare(a.deal.lastCall.at ?? ""));
  const columns = withOwner ? "sm:grid-cols-[minmax(0,1fr)_150px_80px_150px_140px]" : "sm:grid-cols-[minmax(0,1fr)_90px_150px_140px]";
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
      <div className={`hidden gap-4 border-b border-stone-100 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500 sm:grid ${columns}`}>
        <span>Deal</span>
        {withOwner && <span>Commercial</span>}
        <span>Étape</span>
        <span>Dernier échange</span>
        <span>Santé</span>
      </div>
      <ul>
        {sorted.map(({ deal: d, owner }) => {
          const v = VERDICTS[d.verdict];
          return (
            <li key={d.id} className="border-b border-stone-100 last:border-0">
              <Link href={`/deal/${d.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 hover:bg-stone-50 ${columns}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <DealAvatar d={d} size={34} />
                  <span className="truncate text-[14px] font-semibold text-stone-900">{d.name}</span>
                </span>
                {withOwner && (
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-stone-800">
                    {owner && (
                      <>
                        <PersonPhoto name={owner.name} url={owner.avatarUrl} size={28} />
                        <span className="truncate">{firstName(owner.name)}</span>
                      </>
                    )}
                  </span>
                )}
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
