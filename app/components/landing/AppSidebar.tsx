import { Briefcase, CalendarDays, Compass, Sparkles, Target } from "lucide-react";

// Barre latérale de l'app (AppSidebar.tsx de l'app) pour les aperçus de la
// landing : mêmes entrées, même ordre que le menu des deals — Brief, Deals,
// Suivi des deals, puis Méthode (menu du 03/11/2026 ; « Analyse rendez-vous »
// et « Performance » n'y sont plus). Décorative (aria-hidden), masquée sous
// `lg`.
export function AppSidebar({ active, note }: { active: "brief" | "deals" | "suivi" | "methode"; note?: string }) {
  const items = [
    { key: "brief", label: "Brief", icon: Sparkles },
    { key: "deals", label: "Deals", icon: Briefcase },
    { key: "suivi", label: "Suivi des deals", icon: Target },
  ] as const;
  const row = (on: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${on ? "bg-land-accent-soft font-medium text-land-accent" : "text-land-muted"}`;
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-land-line bg-land-surface p-4 lg:flex" aria-hidden>
      <div className="flex items-center gap-2 px-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-accent text-[13px] font-semibold text-white">B</span>
        <span className="text-[15px] font-semibold text-land-ink">Brief</span>
      </div>
      <nav className="mt-6 space-y-0.5 text-[13px]">
        {items.map((it) => (
          <span key={it.key} className={row(it.key === active)}>
            <it.icon className="h-4 w-4" /> {it.label}
          </span>
        ))}
      </nav>
      <div className="mt-5 px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-land-faint">Méthode</div>
      <nav className="mt-2 text-[13px]">
        <span className={row(active === "methode")}>
          <Compass className="h-4 w-4" /> Méthode
        </span>
      </nav>
      {note && (
        <div className="mt-auto rounded-xl bg-land-sunken p-3 text-[11.5px] leading-snug text-land-muted">
          <span className="mb-1 flex items-center gap-1.5 font-medium text-land-ink">
            <CalendarDays className="h-3.5 w-3.5" /> Cette semaine
          </span>
          {note}
        </div>
      )}
    </aside>
  );
}
