"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Video, History, FileCheck, CheckSquare, Bell, Users, Settings, HelpCircle, LogOut, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Style porté du mockup Lovable (app-shell.tsx), juillet 2026 — nav/routes
// inchangées, uniquement le visuel (tokens app/globals.css : var(--violet),
// var(--lavender), brand-gradient). Largeur gardée à w-60 (pas 248px comme
// le mockup) pour ne pas devoir retoucher le ml-60 de tous les layout.tsx.

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all ${
        active
          ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full brand-gradient" />
      )}
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[color:var(--danger)] text-white text-[9px] font-bold leading-none shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function NavGroupLabel({ children }: { children: string }) {
  return (
    <div className="px-3.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </div>
  );
}

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

  const dashboardActive = pathname === "/dashboard";
  const briefActive = pathname.startsWith("/brief");
  const feedbackActive = pathname.startsWith("/feedback");
  const contactsActive = pathname.startsWith("/contacts");
  const quotesActive = pathname.startsWith("/quotes");
  const tasksActive = pathname.startsWith("/tasks");
  const notificationsActive = pathname.startsWith("/notifications");
  const playbookActive = pathname.startsWith("/team/playbook");
  const emailTemplatesActive = pathname.startsWith("/team/email-templates");
  const insightsActive = pathname.startsWith("/team/insights");
  const teamActive = pathname.startsWith("/team") && !playbookActive && !emailTemplatesActive && !insightsActive;
  const settingsActive = pathname.startsWith("/settings");
  const helpActive = pathname.startsWith("/help");

  // Collapsed by default, expanded automatically whenever a sub-page is
  // active (direct nav or refresh lands there) — manual toggling otherwise
  // persists as the user navigates around the rest of the app.
  const [teamMenuOpen, setTeamMenuOpen] = useState(teamActive || playbookActive || emailTemplatesActive || insightsActive);
  useEffect(() => {
    if (playbookActive || emailTemplatesActive || insightsActive) setTeamMenuOpen(true);
  }, [playbookActive, emailTemplatesActive, insightsActive]);

  const pilotageGroup: { href: string; label: string; icon: LucideIcon; active: boolean; badge?: number }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: dashboardActive },
  ];
  const commercialGroup: { href: string; label: string; icon: LucideIcon; active: boolean; badge?: number }[] = [
    { href: "/brief", label: "Brief", icon: FileText, active: briefActive },
    { href: "/feedback", label: "Analyse rendez-vous", icon: Video, active: feedbackActive },
    { href: "/contacts", label: "Historique", icon: History, active: contactsActive },
    { href: "/quotes", label: "Devis", icon: FileCheck, active: quotesActive },
    { href: "/tasks", label: "Tasks", icon: CheckSquare, active: tasksActive, badge: pendingTasksCount },
  ];
  const compteGroup: { href: string; label: string; icon: LucideIcon; active: boolean; badge?: number }[] = [
    { href: "/notifications", label: "Notifications", icon: Bell, active: notificationsActive },
  ];

  return (
    <aside className="brief-ui fixed left-0 top-0 h-full w-60 bg-white/80 backdrop-blur-xl border-r border-border flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl brand-gradient text-white text-sm font-semibold shadow-[var(--shadow-glow)]">
            B
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Brief</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-4 overflow-y-auto">
        <div>
          <NavGroupLabel>Pilotage</NavGroupLabel>
          <div className="space-y-0.5">
            {pilotageGroup.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <NavGroupLabel>Commercial</NavGroupLabel>
          <div className="space-y-0.5">
            {commercialGroup.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <div>
          <NavGroupLabel>Compte</NavGroupLabel>
          <div className="space-y-0.5">
            {compteGroup.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        {/* Équipe + sous-pages (manager only) — collapsible dropdown */}
        {isManager && (
          <div>
            <NavGroupLabel>Manager</NavGroupLabel>
            <div
              className={`relative flex items-center rounded-lg text-sm transition-all ${
                teamActive ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {teamActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full brand-gradient" />
              )}
              <Link href="/team" className="flex items-center gap-3 flex-1 min-w-0 px-3.5 py-2.5">
                <Users className="h-[15px] w-[15px] shrink-0" strokeWidth={teamActive ? 2.25 : 1.75} />
                Équipe
              </Link>
              <button
                onClick={() => setTeamMenuOpen((open) => !open)}
                aria-label={teamMenuOpen ? "Réduire Équipe" : "Développer Équipe"}
                aria-expanded={teamMenuOpen}
                className="pr-3.5 pl-1 py-2.5 shrink-0 text-slate-400 hover:text-slate-600"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${teamMenuOpen ? "rotate-0" : "-rotate-90"}`} />
              </button>
            </div>

            {/* Nested under Équipe — indented to align under its icon, with a
                connecting guide line so the grouping reads visually instead
                of the sub-links floating disconnected from their parent. */}
            {teamMenuOpen && (
              <div className="ml-[18px] pl-3 border-l border-border mt-0.5 space-y-0.5">
                <Link
                  href="/team/playbook"
                  className={`block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                    playbookActive ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Playbook
                </Link>
                <Link
                  href="/team/email-templates"
                  className={`block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                    emailTemplatesActive ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Templates emails
                </Link>
                <Link
                  href="/team/insights"
                  className={`block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                    insightsActive ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  Insights
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Bottom — help, settings, sign out, user */}
      <div className="px-3 py-3 space-y-2 shrink-0">
        <Link
          href="/help"
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-[12.5px] font-medium hover:bg-slate-50 transition-colors ${
            helpActive ? "text-[color:var(--violet)]" : "text-slate-600"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Aide
        </Link>

        <Link
          href="/settings"
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-[12.5px] font-medium hover:bg-slate-50 transition-colors ${
            settingsActive ? "text-[color:var(--violet)]" : "text-slate-600"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Paramètres
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>

        {/* User card */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white p-2.5 mt-1">
          <div className="grid h-9 w-9 place-items-center rounded-lg brand-gradient text-white text-[11px] font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium text-slate-900 leading-none truncate">{userName}</p>
            {userEmail && <p className="text-[10.5px] text-slate-500 mt-1 truncate">{userEmail}</p>}
          </div>
        </div>
      </div>
    </aside>
  );
}
