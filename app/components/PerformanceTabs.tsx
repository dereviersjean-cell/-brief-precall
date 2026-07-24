"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Onglets de la section Performance — fusion des anciennes entrées Dashboard,
// Objections et Historique (recentrage produit, juillet 2026). Chaque onglet
// garde sa route et son URL propres ; ce bandeau est rendu par les trois
// layouts concernés, juste sous la TopBar (sticky top-14 = hauteur TopBar).
const TABS = [
  { href: "/dashboard", label: "Vue d'ensemble" },
  { href: "/objections", label: "Objections" },
  { href: "/contacts", label: "Historique" },
] as const;

export default function PerformanceTabs() {
  const pathname = usePathname();

  return (
    <div className="brief-ui sticky top-14 z-[9] border-b border-border/80 bg-white/70 backdrop-blur-xl">
      <nav className="flex items-center gap-1 px-4 lg:px-10">
        {TABS.map((tab) => {
          const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-3 py-2.5 text-[13px] transition-colors ${
                active ? "text-[color:var(--violet)] font-medium" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-t-full brand-gradient" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
