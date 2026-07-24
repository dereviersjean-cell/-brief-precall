"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, MessagesSquare, Dumbbell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Sidebar n'a plus qu'un lien unique « Performance » (AppSidebar.tsx) — la
// navigation entre les sous-sections se fait ici, en onglets, même pattern
// que TeamTabs (app/team/TeamTabs.tsx) et SettingsTabs. Onglets par thème de
// statistiques détaillées (pas par type de page brute) : Historique n'est
// plus un onglet — les blocs "Scores par dimension" et "Objections
// importantes" qui n'étaient que des cartes résumées dans Vue d'ensemble
// deviennent chacun leur propre page détaillée (recentrage du 25/07/2026).
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/scores", label: "Scores", icon: Target },
  { href: "/dashboard/objections", label: "Objections", icon: MessagesSquare },
  { href: "/training", label: "Entraînement", icon: Dumbbell },
];

export default function PerformanceTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 lg:px-10">
      {TABS.map((tab) => {
        const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 h-11 text-[13px] font-medium transition-colors ${
              active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full brand-gradient" />}
          </Link>
        );
      })}
    </nav>
  );
}
