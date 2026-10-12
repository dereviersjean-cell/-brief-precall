import { BarChart3, CalendarDays, Sparkles, Users, Video } from "lucide-react";

// Barre latérale de l'app (AppSidebar.tsx de l'app) pour les aperçus de la
// landing : mêmes entrées, même ordre — Brief, Analyse rendez-vous,
// Performance, puis Équipe. Décorative (aria-hidden), masquée sous `lg`.
export function AppSidebar({ active, note }: { active: "brief" | "calls" | "performance"; note?: string }) {
  const items = [
    { key: "brief", label: "Brief", icon: Sparkles },
    { key: "calls", label: "Analyse rendez-vous", icon: Video },
    { key: "performance", label: "Performance", icon: BarChart3 },
  ] as const;
  return (
    <aside className="hidden w-52 shrink-0 flex-col border-r border-land-line bg-land-surface p-4 lg:flex" aria-hidden>
      <div className="flex items-center gap-2 px-1.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-accent text-[13px] font-semibold text-white">B</span>
        <span className="text-[15px] font-semibold text-land-ink">Brief</span>
      </div>
      <div className="mt-6 px-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-land-faint">Commercial</div>
      <nav className="mt-2 space-y-0.5 text-[13px]">
        {items.map((it) => (
          <span
            key={it.key}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
              it.key === active ? "bg-land-accent-soft font-medium text-land-accent" : "text-land-muted"
            }`}
          >
            <it.icon className="h-4 w-4" /> {it.label}
          </span>
        ))}
        <span className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-land-muted">
          <Users className="h-4 w-4" /> Équipe
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
