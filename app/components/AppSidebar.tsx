"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { FileText, Video, History, FileCheck, CheckSquare, Users, Settings, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await fetch("/api/tasks/pending-count");
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (!cancelled) setPendingTasksCount(data.count);
      } catch {
        // ignore transient errors — badge just stays at its last known value
      }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const userName = session?.user?.name ?? "Jean Dupont";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userEmail = session?.user?.email ?? "";

  const isManager = session?.role === "manager";

  const briefActive = pathname === "/dashboard" || pathname.startsWith("/brief");
  const feedbackActive = pathname.startsWith("/feedback");
  const contactsActive = pathname.startsWith("/contacts");
  const quotesActive = pathname.startsWith("/quotes");
  const tasksActive = pathname.startsWith("/tasks");
  const playbookActive = pathname.startsWith("/team/playbook");
  const emailTemplatesActive = pathname.startsWith("/team/email-templates");
  const teamActive = pathname.startsWith("/team") && !playbookActive && !emailTemplatesActive;
  const settingsActive = pathname === "/settings";

  const navItems: { href: string; label: string; icon: LucideIcon; active: boolean; badge?: number }[] = [
    { href: "/dashboard", label: "Brief", icon: FileText, active: briefActive },
    { href: "/feedback", label: "Analyse rendez-vous", icon: Video, active: feedbackActive },
    { href: "/contacts", label: "Historique", icon: History, active: contactsActive },
    { href: "/quotes", label: "Devis", icon: FileCheck, active: quotesActive },
    { href: "/tasks", label: "Tasks", icon: CheckSquare, active: tasksActive, badge: pendingTasksCount },
  ];

  return (
    <aside className="brief-ui fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <span className="font-bold text-gray-900 text-base">Brief</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                item.active ? "bg-[#F5F3FF] text-primary" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-primary" />
              )}
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shrink-0">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Équipe + Playbook (manager only) */}
        {isManager && (
          <>
            <Link
              href="/team"
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                teamActive ? "bg-[#F5F3FF] text-primary" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {teamActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-primary" />
              )}
              <Users className="w-4 h-4 shrink-0" />
              Équipe
            </Link>
            <Link
              href="/team/playbook"
              className={`relative flex items-center gap-2 pl-10 pr-3.5 py-2 rounded-lg text-sm transition-colors duration-200 ${
                playbookActive ? "bg-[#F5F3FF] text-primary font-medium" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {playbookActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-primary" />
              )}
              Playbook
            </Link>
            <Link
              href="/team/email-templates"
              className={`relative flex items-center gap-2 pl-10 pr-3.5 py-2 rounded-lg text-sm transition-colors duration-200 ${
                emailTemplatesActive ? "bg-[#F5F3FF] text-primary font-medium" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {emailTemplatesActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-sm bg-primary" />
              )}
              Templates emails
            </Link>
          </>
        )}
      </nav>

      {/* Bottom — settings, sign out, user */}
      <div className="px-3 py-4 space-y-2 shrink-0">
        <Link
          href="/settings"
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors duration-200 ${
            settingsActive ? "text-primary" : "text-gray-600"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Paramètres
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>

        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{userInitials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 leading-none truncate">{userName}</p>
            {userEmail && <p className="text-xs text-gray-500 mt-1 truncate">{userEmail}</p>}
          </div>
        </div>
      </div>
    </aside>
  );
}
