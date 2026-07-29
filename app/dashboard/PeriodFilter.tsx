"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { PERIOD_PRESETS, periodSearchParams, type PeriodPreset } from "@/lib/period";

// Filtre de période des onglets Performance. Écrit dans l'URL plutôt que
// dans un state local : la page est un server component qui refetch sur les
// query params, et le manager peut partager/mettre en favori une vue
// « objections de mars ». Conserve les autres paramètres (?commercial=) en
// repartant des searchParams courants, comme CommercialSelector conserve
// l'onglet via usePathname.
export default function PeriodFilter({
  preset,
  from,
  to,
}: {
  preset: PeriodPreset;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [customOpen, setCustomOpen] = useState(preset === "custom");
  // Les bornes arrivent en ISO complet ; <input type="date"> veut YYYY-MM-DD.
  const [customFrom, setCustomFrom] = useState(from ? from.slice(0, 10) : "");
  const [customTo, setCustomTo] = useState(to ? to.slice(0, 10) : "");

  const commercial = searchParams.get("commercial");

  function apply(next: PeriodPreset, custom?: { from?: string; to?: string }) {
    const query = periodSearchParams(next, custom ?? {}, { commercial });
    router.push(`${pathname}?${query}`);
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-[var(--shadow-xs)]">
        <CalendarRange className="ml-1.5 mr-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        {PERIOD_PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              apply(option.value);
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              preset === option.value
                ? "bg-[color:var(--lavender)] text-[color:var(--violet)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((open) => !open)}
          className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            preset === "custom"
              ? "bg-[color:var(--lavender)] text-[color:var(--violet)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Dates précises
        </button>
      </div>

      {customOpen && (
        <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 shadow-[var(--shadow-xs)]">
          <label htmlFor="period-from" className="text-[12.5px] text-slate-500">
            Du
          </label>
          <input
            id="period-from"
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-border px-2 py-1 text-[12.5px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
          />
          <label htmlFor="period-to" className="text-[12.5px] text-slate-500">
            au
          </label>
          <input
            id="period-to"
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-border px-2 py-1 text-[12.5px] text-slate-900 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
          />
          <button
            type="button"
            disabled={!customFrom && !customTo}
            onClick={() => apply("custom", { from: customFrom || undefined, to: customTo || undefined })}
            className="rounded-lg brand-gradient px-3 py-1.5 text-[12.5px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Appliquer
          </button>
        </div>
      )}
    </div>
  );
}
