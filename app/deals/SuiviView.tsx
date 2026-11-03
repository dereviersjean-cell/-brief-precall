"use client";

import Link from "next/link";
import { useState } from "react";
import DealAvatar from "@/app/components/DealAvatar";
import PersonPhoto from "@/app/components/PersonPhoto";
import { firstName } from "@/lib/deal-coaching";
import type { SuiviDeal } from "@/lib/deal-suivi";
import type { TeamPerson } from "./team";

// Suivi des deals, vue « Par commercial » (choisie par Jean le 03/11/2026
// parmi trois propositions sur aperçu) : un bloc par commercial — ce qui
// revient sur ses deals (conseil Haiku sur la personne), puis les deals à
// reprendre avec lui, raison et action. Ses autres deals restent repliés.

function ago(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

const byIdle = (a: SuiviDeal, b: SuiviDeal) => (a.idleDays ?? 9999) - (b.idleDays ?? 9999);

function Others({ deals }: { deals: SuiviDeal[] }) {
  const [open, setOpen] = useState(false);
  if (deals.length === 0) return null;
  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button onClick={() => setOpen(!open)} className="text-[13px] font-medium text-slate-500 hover:text-slate-900">
        {open ? "Masquer" : "Voir"} {deals.length === 1 ? "son autre deal" : `ses ${deals.length} autres deals`}
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-slate-100">
          {deals.map((d) => {
            return (
              <li key={d.id} className="flex items-center gap-3 py-2 text-[13.5px]">
                <Link href={`/deal/${d.id}`} className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:underline">
                  {d.name}
                </Link>
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${d.level === "surveiller" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
                >
                  {d.level === "surveiller" ? "À surveiller" : "Avance"}
                </span>
                <span className="w-[100px] text-right text-[12.5px] text-slate-500">{ago(d.idleDays)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PersonBlock({ p }: { p: TeamPerson }) {
  const act = p.deals.filter((d) => d.level === "intervenir").sort(byIdle);
  const others = p.deals.filter((d) => d.level !== "intervenir").sort(byIdle);
  const first = firstName(p.name);
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6">
      <div className="flex items-center gap-3">
        <PersonPhoto name={p.name} url={p.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-slate-900">{p.name}</p>
          <p className="text-[13px] text-slate-500">
            {act.length === 0 ? "Rien à reprendre" : `${act.length} deal${act.length > 1 ? "s" : ""} à reprendre avec ${first}`} · {p.deals.length} en cours
          </p>
        </div>
      </div>
      {p.advice && act.length > 0 && (
        <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-800">
          <span className="font-semibold">{p.advice.title}</span> — {p.advice.why}
        </p>
      )}
      {act.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {act.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex items-center gap-2.5">
                <DealAvatar d={d} size={34} />
                <Link href={`/deal/${d.id}`} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-900 hover:underline">
                  {d.name}
                </Link>
                <span className="shrink-0 text-[12.5px] text-slate-500">
                  R{d.rank} · {ago(d.idleDays)}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-rose-700">{d.reason}</p>
              <p className="mt-1 text-[13.5px] font-medium text-slate-900">→ {d.action}</p>
            </li>
          ))}
        </ul>
      )}
      <Others deals={others} />
    </section>
  );
}

export default function SuiviView({ people, hasTeam }: { people: TeamPerson[]; hasTeam: boolean }) {
  const shown = people
    .filter((p) => p.deals.length > 0)
    .sort((a, b) => b.deals.filter((d) => d.level === "intervenir").length - a.deals.filter((d) => d.level === "intervenir").length);
  if (shown.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-5 text-[13.5px] text-slate-500">
        {hasTeam
          ? "Aucun deal en cours dans l'équipe : chaque call enregistré crée ou complète le deal de son prospect."
          : "Aucun commercial ne vous est rattaché : demandez à l'administrateur de Brief de vous lier à votre équipe pour suivre ses deals."}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {shown.map((p) => (
        <PersonBlock key={p.id} p={p} />
      ))}
    </div>
  );
}
