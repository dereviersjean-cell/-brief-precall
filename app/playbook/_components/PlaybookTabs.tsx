"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MessagesSquare, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import { useModules } from "@/app/components/ModulesProvider";

// Section « Playbook & objections » (15/10/2026, demande de Jean) : la grille
// de notation et tout ce qui touche aux objections, réunis sous une entrée de
// la barre latérale au lieu d'être éparpillés entre Performance et
// Paramètres. Un onglet par module ouvert (lib/modules.ts).
const TABS: { href: string; label: string; icon: LucideIcon; module: ModuleKey }[] = [
  { href: "/playbook", label: "Grille de notation", icon: BookOpen, module: "playbook" },
  { href: "/playbook/objections", label: "Objections rencontrées", icon: MessagesSquare, module: "objections" },
  { href: "/playbook/reponses", label: "Réponses aux objections", icon: ListChecks, module: "objections" },
];

export default function PlaybookTabs() {
  const pathname = usePathname();
  const { isEnabled } = useModules();
  const tabs = TABS.filter((t) => isEnabled(t.module));
  if (tabs.length < 2) return null;
  return (
    <nav className="sticky top-14 z-[9] flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border bg-[color:var(--background)]/80 px-4 backdrop-blur-xl lg:px-10">
      {tabs.map((tab) => {
        const active = tab.href === "/playbook" ? pathname === "/playbook" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex h-11 items-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors ${
              active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
            {tab.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-[color:var(--primary)]" />}
          </Link>
        );
      })}
    </nav>
  );
}
