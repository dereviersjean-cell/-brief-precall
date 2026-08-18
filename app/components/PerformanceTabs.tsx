"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, MessagesSquare, BookOpen, BarChart3, Dumbbell, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/scores", label: "Scores", icon: Target },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/objections", label: "Objections", icon: MessagesSquare },
  { href: "/dashboard/playbook", label: "Playbook", icon: BookOpen },
  { href: "/training", label: "Entraînement", icon: Dumbbell },
];

export default function PerformanceTabs() {
  const pathname = usePathname();

  // Module additionnel (migration 003) — grise l'onglet quand non débloqué
  // pour l'organisation. Purement visuel : /training applique le vrai gate
  // côté serveur quelle que soit cette valeur (fail-closed par défaut, donc
  // pas de flash "actif" avant la réponse).
  const [trainingEnabled, setTrainingEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/training/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { enabled: boolean } | null) => {
        if (!cancelled && data) setTrainingEnabled(data.enabled);
      })
      .catch(() => {
        // reste verrouillé visuellement — cohérent avec le fail-closed serveur
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    // Collée sous la TopBar (elle-même `sticky top-0`, h-14 = 56px) : sans
    // cela, sur une page longue comme Objections, les onglets défilaient hors
    // de vue et on se retrouvait bloqué dans une sous-page sans aucun moyen
    // de revenir. z-index juste en dessous de la TopBar pour passer dessous
    // et non par-dessus. Même fond translucide flouté qu'elle, sinon le
    // contenu se voit au travers en défilant.
    <nav data-tour="performance-tabs" className="sticky top-14 z-[9] flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border bg-white/70 px-4 backdrop-blur-xl lg:px-10">
      {TABS.map((tab) => {
        const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        const locked = tab.href === "/training" && !trainingEnabled;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={locked ? "Module additionnel — non débloqué" : undefined}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 h-11 text-[13px] font-medium transition-colors ${
              locked
                ? "text-slate-400 hover:text-slate-500"
                : active
                ? "text-[color:var(--violet)]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
            {locked && <Lock className="h-3 w-3 text-slate-300" />}
            {active && !locked && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full brand-gradient" />}
          </Link>
        );
      })}
    </nav>
  );
}
