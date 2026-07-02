"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { label: "⚙️ Config", href: "/admin" },
  { label: "🧪 Test Brief", href: "/admin/test-brief" },
  { label: "📞 Test Analyse", href: "/admin/test-analysis" },
  { label: "✉️ Test Email", href: "/admin/test-email" },
  { label: "✏️ Prompts", href: "/admin/prompts" },
  { label: "👥 Utilisateurs", href: "/admin/dashboard" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex overflow-x-auto -mb-px">
          {TABS.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <a
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
