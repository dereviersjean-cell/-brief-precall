"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Mail, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Sidebar n'a plus qu'un lien unique « Équipe » (AppSidebar.tsx) — la
// navigation entre les sous-sections se fait ici, en onglets, comme
// SettingsTabs (app/settings/_components/SettingsTabs.tsx). Masqué sur
// /team/[commercialId] (page de détail d'un commercial, pas une des 4
// catégories ci-dessous).
// Playbook a quitté cet onglet le 29/07/2026 pour Performance (voir
// PerformanceTabs) — /team/playbook survit en redirection pour les favoris,
// d'où sa présence dans KNOWN_SEGMENTS : sans elle, la barre d'onglets
// disparaîtrait le temps de la redirection.
const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/team", label: "Équipe", icon: Users },
  { href: "/team/email-templates", label: "Templates emails", icon: Mail },
  { href: "/team/insights", label: "Insights", icon: BarChart3 },
];

const KNOWN_SEGMENTS = new Set(["playbook", "email-templates", "insights"]);

export default function TeamTabs() {
  const pathname = usePathname();
  const firstSegment = pathname.split("/")[2];

  // /team/[commercialId](/calls/...) — pas une des catégories connues.
  if (firstSegment && !KNOWN_SEGMENTS.has(firstSegment)) return null;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 lg:px-10">
      {TABS.map((tab) => {
        const active = tab.href === "/team" ? pathname === "/team" : pathname.startsWith(tab.href);
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
