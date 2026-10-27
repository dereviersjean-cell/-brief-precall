import Link from "next/link";
import type { DealProgress, DealVerdict, FocusStatus } from "@/lib/deal-progress";

// Pièces d'affichage des deals partagées par « Mes deals », la vue manager et
// la page d'un deal. Sans "use client" : utilisables côté serveur comme côté
// navigateur.

export const VERDICTS: Record<DealVerdict, { label: string; tone: string; dot: string }> = {
  recul: { label: "En recul", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  arret: { label: "À l'arrêt", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  progres: { label: "En progrès", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

export const FOCUS: Record<FocusStatus, { label: string; tone: string; dot: string; ring: string }> = {
  relancer: { label: "À relancer", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500", ring: "ring-rose-300" },
  traiter: { label: "À traiter", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500", ring: "ring-amber-300" },
  bonne_voie: { label: "En bonne voie", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-300" },
};

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

// Un deal par ligne : où il en est en une ligne, ce qu'il faut faire en une
// autre, et l'accès à sa page.
export function DealList({ deals }: { deals: DealProgress[] }) {
  return (
    <ul className="divide-y divide-border">
      {deals.map((d) => {
        const f = FOCUS[d.focus.status];
        const meta = [
          d.hubspot?.stage ?? null,
          d.hubspot?.amount != null ? formatAmount(d.hubspot.amount) : null,
          `R${d.steps.length}`,
          `${d.known}/${d.total} infos`,
          d.lastCall.at ? `dernier call le ${formatDay(d.lastCall.at)}` : null,
        ].filter(Boolean);
        return (
          <li key={d.id}>
            <Link href={`/deal/${d.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 hover:bg-slate-50/70">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${f.dot}`} aria-label={f.label} title={f.label} />
              <div className="min-w-0 flex-1 basis-[220px]">
                <p className="truncate text-[14px] font-semibold text-slate-900 group-hover:text-[color:var(--violet)]">{d.name}</p>
                <p className="truncate text-[12px] text-slate-500">{meta.join(" · ")}</p>
              </div>
              <div className="min-w-0 basis-[260px] sm:flex-1">
                <p className="text-[13.5px] font-medium text-slate-900">{d.focus.action}</p>
                {d.focus.detail && <p className="text-[12px] text-slate-500">{d.focus.detail}</p>}
              </div>
              <span className="ml-auto shrink-0 text-[13px] font-medium text-[color:var(--violet)]">Ouvrir →</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
