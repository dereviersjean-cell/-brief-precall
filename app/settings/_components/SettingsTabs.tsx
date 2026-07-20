"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings, Link as LinkIcon, Database, Library, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Notifications moved out to its own top-level sidebar item (AppSidebar.tsx,
// /notifications) — it's a frequent daily-use setting, not an occasional
// one, so it doesn't belong buried under Paramètres with the others.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { href: "/settings/general", label: "Général", icon: Settings },
  { href: "/settings/connexions", label: "Connexions", icon: LinkIcon },
  { href: "/settings/crm", label: "CRM", icon: Database },
  { href: "/settings/references", label: "Références clients", icon: Library },
  { href: "/settings/billing", label: "Facturation", icon: CreditCard, managerOnly: true },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isManager = session?.role === "manager";

  const items = NAV_ITEMS.filter((item) => !item.managerOnly || isManager);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 h-11 text-[13px] font-medium transition-colors ${
              active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full brand-gradient" />}
          </Link>
        );
      })}
    </nav>
  );
}
