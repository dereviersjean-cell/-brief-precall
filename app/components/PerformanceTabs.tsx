"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, MessagesSquare, BookOpen, BarChart3, Dumbbell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import { useModules } from "./ModulesProvider";

// Sidebar n'a plus qu'un lien unique « Performance » (AppSidebar.tsx) — la
// navigation entre les sous-sections se fait ici, en onglets, même pattern
// que TeamTabs (app/team/TeamTabs.tsx) et SettingsTabs. Onglets par thème de
// statistiques détaillées (pas par type de page brute) : Historique n'est
// plus un onglet — les blocs "Scores par dimension" et "Objections
// importantes" qui n'étaient que des cartes résumées dans Vue d'ensemble
// deviennent chacun leur propre page détaillée (recentrage du 25/07/2026).
// Ajouts du 29/07/2026 : « Analytics » (statistiques de conduite de RDV,
// activité + interactions) et « Playbook », rapatrié depuis /team — le
// playbook est la grille de notation, il appartient au thème Performance
// bien plus qu'au pilotage d'équipe, et les commerciaux doivent pouvoir le
// consulter (en lecture seule, cf. app/dashboard/playbook/page.tsx).
// `module` : onglet d'un module activable (lib/modules.ts), absent tant que
// l'account manager ne l'a pas ouvert pour l'organisation.
const TABS: { href: string; label: string; icon: LucideIcon; module?: ModuleKey }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/scores", label: "Scores", icon: Target },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, module: "insights" },
  { href: "/dashboard/objections", label: "Objections", icon: MessagesSquare, module: "objections" },
  { href: "/dashboard/playbook", label: "Playbook", icon: BookOpen, module: "playbook" },
  { href: "/training", label: "Entraînement", icon: Dumbbell, module: "training" },
];

export default function PerformanceTabs() {
  const pathname = usePathname();

  // Entraînement était grisé avec un cadenas quand il n'était pas débloqué.
  // Depuis le parcours client (29/09/2026), un module fermé n'apparaît pas.
  const { isEnabled } = useModules();
  const tabs = TABS.filter((tab) => !tab.module || isEnabled(tab.module));

  return (
    // Collée sous la TopBar (elle-même `sticky top-0`, h-14 = 56px) : sans
    // cela, sur une page longue comme Objections, les onglets défilaient hors
    // de vue et on se retrouvait bloqué dans une sous-page sans aucun moyen
    // de revenir. z-index juste en dessous de la TopBar pour passer dessous
    // et non par-dessus. Même fond translucide flouté qu'elle, sinon le
    // contenu se voit au travers en défilant.
    <nav data-tour="performance-tabs" className="sticky top-14 z-[9] flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border bg-white/70 px-4 backdrop-blur-xl lg:px-10">
      {tabs.map((tab) => {
        const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 h-11 text-[13px] font-medium transition-colors ${
              active
                ? "text-[color:var(--violet)]"
                : "text-slate-500 hover:text-slate-900"
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
