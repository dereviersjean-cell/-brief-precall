"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Link as LinkIcon, Database, Library } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Notifications moved out to its own top-level sidebar item (AppSidebar.tsx,
// /notifications) — it's a frequent daily-use setting, not an occasional
// one, so it doesn't belong buried under Paramètres with the others.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings/general", label: "Général", icon: Settings },
  { href: "/settings/connexions", label: "Connexions", icon: LinkIcon },
  { href: "/settings/crm", label: "CRM", icon: Database },
  { href: "/settings/references", label: "Références clients", icon: Library },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-52 shrink-0 sticky top-10">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2.5 mb-2">Paramètres</p>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
