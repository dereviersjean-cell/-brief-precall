"use client";

import { usePathname } from "next/navigation";
import {
  Settings,
  FlaskConical,
  PhoneCall,
  Mail,
  PenLine,
  Activity,
  Building2,
  BookOpen,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Deux espaces (29/09/2026) : le suivi des clients, que les account managers
// ouvrent chaque jour, et les outils techniques (réglages des prompts, bancs
// d'essai, monitoring), qu'ils n'ont pas besoin de voir. L'admin s'ouvre sur
// les clients.
const SECTIONS: { title: string; items: { label: string; href: string; icon: LucideIcon }[] }[] = [
  {
    title: "Suivi clients",
    items: [{ label: "Clients", href: "/admin/clients", icon: Building2 }],
  },
  {
    title: "Outils techniques",
    items: [
      { label: "Réglages du brief", href: "/admin/config", icon: Settings },
      { label: "Prompts", href: "/admin/prompts", icon: PenLine },
      { label: "Test brief", href: "/admin/test-brief", icon: FlaskConical },
      { label: "Test analyse", href: "/admin/test-analysis", icon: PhoneCall },
      { label: "Test email", href: "/admin/test-email", icon: Mail },
      { label: "Articles d'aide", href: "/admin/help", icon: BookOpen },
      { label: "Monitoring", href: "/admin/dashboard", icon: Activity },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    // Même barre que l'app client (AppSidebar.tsx) : largeur, logo, style des
    // liens. Seul le sous-titre « Administration » dit où l'on est.
    <aside className="brief-ui fixed left-0 top-0 z-20 flex h-full w-60 flex-col border-r border-border bg-white">
      <div className="flex shrink-0 items-center gap-2.5 px-5 pb-4 pt-5">
        <a href="/admin" className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--primary)] text-[14px] font-semibold text-white">
            B
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[16px] font-semibold tracking-tight text-slate-900">Brief</div>
            <div className="text-[11px] text-slate-500">Administration</div>
          </div>
        </a>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon }) => {
                // Une section active sur ses sous-pages aussi (fiche d'un
                // client, détail d'un utilisateur).
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <a
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors ${
                      active
                        ? "bg-[color:var(--lavender)] font-medium text-[color:var(--violet)]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
