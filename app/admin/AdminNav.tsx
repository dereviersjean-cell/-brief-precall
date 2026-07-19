"use client";

import { usePathname } from "next/navigation";
import {
  Settings,
  FlaskConical,
  PhoneCall,
  Mail,
  PenLine,
  LayoutDashboard,
  Building2,
  BookOpen,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Config", href: "/admin", icon: Settings },
  { label: "Test Brief", href: "/admin/test-brief", icon: FlaskConical },
  { label: "Test Analyse", href: "/admin/test-analysis", icon: PhoneCall },
  { label: "Test Email", href: "/admin/test-email", icon: Mail },
  { label: "Prompts", href: "/admin/prompts", icon: PenLine },
  { label: "Aide", href: "/admin/help", icon: BookOpen },
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Organisations", href: "/admin/organizations", icon: Building2 },
];

export function AdminNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center border-b border-slate-100 shrink-0">
        <a href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-semibold text-slate-900 text-sm leading-none block">Brief</span>
            <span className="text-[11px] text-slate-400 leading-none">Administration</span>
          </div>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-indigo-600" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </a>
          );
        })}
      </nav>

      {/* Bottom — logout */}
      <div className="border-t border-slate-100 px-3 py-3 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
