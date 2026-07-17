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

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 flex-wrap">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              active ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
