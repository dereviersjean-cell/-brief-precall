"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { label: "⚙️ Config", href: "/admin" },
  { label: "🧪 Test Brief", href: "/admin/test-brief" },
  { label: "📞 Test Analyse", href: "/admin/test-analysis" },
  { label: "✉️ Test Email", href: "/admin/test-email" },
  { label: "✏️ Prompts", href: "/admin/prompts" },
  { label: "📊 Dashboard", href: "/admin/dashboard" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin";
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-48 bg-white border-r border-slate-200 flex flex-col z-20">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center border-b border-slate-100 shrink-0">
        <a href="/admin" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-slate-900">Admin</span>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {TABS.map(({ label, href }) => {
          const active = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </a>
          );
        })}
      </nav>

      {/* Bottom — logout */}
      <div className="border-t border-slate-100 px-3 py-3 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
