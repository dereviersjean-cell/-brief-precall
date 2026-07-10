"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Link as LinkIcon, Database, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings/general", label: "Général", icon: Settings },
  { href: "/settings/connexions", label: "Connexions", icon: LinkIcon },
  { href: "/settings/crm", label: "CRM", icon: Database },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg text-sm transition-colors ${
              active ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-indigo-600" />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
