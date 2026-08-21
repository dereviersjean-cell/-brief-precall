"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Video, Users, Settings, HelpCircle, LogOut, Sparkles, Menu, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchJsonOnce } from "@/lib/fetch-once";
import type { ChromeState } from "@/lib/chrome-state";

type OrgStatus = {
  organizationName: string | null;
  billingStatus: string;
  trialEndsAt: string | null;
  seatCount: number;
};

function daysRemaining(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

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
  tourId,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  // Ancre de la visite guidée (app/components/GuidedTour.tsx) — attribut
  // dédié plutôt qu'un sélecteur de href, pour que ce lien soit visiblement
  // référencé ailleurs.
  tourId?: string;
}) {
  return (
    <Link
      href={href}
      data-tour={tourId}
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
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-close the mobile drawer on every navigation — otherwise it stays
  // open over the new page after tapping a link.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    // fetchJsonOnce et pas fetch : ce composant est remonté à chaque
    // changement de section (chaque layout monte sa propre sidebar), et le nom
    // de l'organisation ne dépend pas de la page affichée.
    fetchJsonOnce<ChromeState>("/api/chrome").then((data) => {
      if (!cancelled && data) setOrgStatus(data);
    });
    return () => {
      cancelled = true;
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

  // « Performance » regroupe Vue d'ensemble + Historique + Entraînement,
  // navigables en onglets (app/components/PerformanceTabs.tsx) — Objections
  // reste dans Paramètres.
  const performanceActive =
    pathname === "/dashboard" || pathname.startsWith("/contacts") || pathname.startsWith("/training");
  const briefActive = pathname.startsWith("/brief");
  const feedbackActive = pathname.startsWith("/feedback");
  // Équipe est un lien unique — les sous-pages (Playbook, Templates emails,
  // Insights) se naviguent via des onglets en haut de /team (TeamTabs.tsx),
  // pas depuis la sidebar.
  const teamActive = pathname.startsWith("/team");
  const settingsActive = pathname.startsWith("/settings");
  const helpActive = pathname.startsWith("/help");

  const commercialGroup: { href: string; label: string; icon: LucideIcon; active: boolean; badge?: number }[] = [
    { href: "/brief", label: "Brief", icon: FileText, active: briefActive },
    { href: "/feedback", label: "Analyse rendez-vous", icon: Video, active: feedbackActive },
    { href: "/dashboard", label: "Performance", icon: LayoutDashboard, active: performanceActive },
  ];

  return (
    <>
      {/* Mobile trigger — fixed, only shown below lg where the sidebar is
          hidden by default. Lives here (not in TopBar) so this component
          stays fully self-contained on mobile, no cross-component state. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="brief-ui fixed top-3 left-3 z-30 grid h-10 w-10 place-items-center rounded-lg border border-border bg-white/90 backdrop-blur text-slate-600 shadow-[var(--shadow-sm)] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={`brief-ui fixed left-0 top-0 h-full w-60 bg-white/80 backdrop-blur-xl border-r border-border flex flex-col z-40 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl brand-gradient text-white text-sm font-semibold shadow-[var(--shadow-glow)] shrink-0">
            B
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">Brief</div>
            {orgStatus?.organizationName && (
              <div className="text-[10.5px] text-slate-500 truncate">{orgStatus.organizationName}</div>
            )}
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-4 overflow-y-auto">
        <div>
          <NavGroupLabel>Commercial</NavGroupLabel>
          <div className="space-y-0.5">
            {commercialGroup.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                tourId={
                  item.href === "/brief"
                    ? "nav-brief"
                    : item.href === "/feedback"
                    ? "nav-feedback"
                    : item.href === "/dashboard"
                    ? "nav-performance"
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Équipe (manager only) — lien unique ; les sous-pages se naviguent
            via des onglets en haut de /team (TeamTabs.tsx). */}
        {isManager && (
          <div>
            <NavGroupLabel>Manager</NavGroupLabel>
            <div className="space-y-0.5">
              <NavLink href="/team" label="Équipe" icon={Users} active={teamActive} />
            </div>
          </div>
        )}
      </nav>

      {/* Bottom — help, settings, sign out, user */}
      <div className="px-3 py-3 space-y-1.5 shrink-0">
        {orgStatus?.billingStatus === "trialing" && orgStatus.trialEndsAt && (
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[color:var(--lavender)] to-white p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[color:var(--violet)]">
              <Sparkles className="h-3.5 w-3.5" /> Essai actif
            </div>
            <div className="mt-1 text-[11.5px] text-slate-600">
              {daysRemaining(orgStatus.trialEndsAt)} jours restants · {orgStatus.seatCount} siège{orgStatus.seatCount > 1 ? "s" : ""}
            </div>
            <Link href="/settings/billing" className="mt-2 inline-flex text-[11.5px] font-medium text-[color:var(--violet)] hover:underline">
              Gérer la facturation →
            </Link>
          </div>
        )}

        <Link
          href="/help"
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11.5px] font-medium hover:bg-slate-50 transition-colors ${
            helpActive ? "text-[color:var(--violet)]" : "text-slate-600"
          }`}
        >
          <HelpCircle className="h-3 w-3" />
          Aide
        </Link>

        <Link
          href="/settings"
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11.5px] font-medium hover:bg-slate-50 transition-colors ${
            settingsActive ? "text-[color:var(--violet)]" : "text-slate-600"
          }`}
        >
          <Settings className="h-3 w-3" />
          Paramètres
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          Déconnexion
        </button>

        {/* User card */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-2 mt-1">
          <div className="grid h-7 w-7 place-items-center rounded-lg brand-gradient text-white text-[10px] font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-medium text-slate-900 leading-none truncate">{userName}</p>
            {userEmail && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{userEmail}</p>}
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
