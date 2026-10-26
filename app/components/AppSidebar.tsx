"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { LayoutDashboard, FileText, Video, Users, Settings, HelpCircle, LogOut, Sparkles, Menu, X, Lock, BookOpen, Library, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useChromeState } from "./ShellProvider";
import { useModules } from "./ModulesProvider";
import TalkToSales from "./TalkToSales";
import CompanyLogo from "./CompanyLogo";
import { companyDomainFromEmail } from "@/lib/company-domain";

type OrgStatus = {
  organizationName: string | null;
  billingStatus: string;
  trialEndsAt: string | null;
  seatCount: number;
};

function daysRemaining(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

// Visuel aligné sur le site public (octobre 2026) et sur sa réplique de la
// barre latérale (app/components/landing/AppSidebar.tsx) : fond blanc uni,
// logo en aplat, entrée active sur fond d'accent pâle, pas de dégradé ni de
// halo. Nav/routes inchangées. Largeur gardée à w-60 pour ne pas devoir
// retoucher le ml-60 de tous les layout.tsx.

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
      // La page Brief se lit entièrement côté serveur (agenda compris) et n'a
      // pas d'écran de chargement : préchargée en entier, le clic l'affiche
      // aussitôt.
      prefetch={href === "/brief" ? true : undefined}
      data-tour={tourId}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors ${
        active
          ? "bg-[color:var(--lavender)] text-[color:var(--violet)] font-medium"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[color:var(--danger)] text-white text-[9px] font-bold leading-none shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

// Entrée de l'accès complet montrée à une inscription libre (accès « briefs ») :
// grisée, sans lien, avec un cadenas — pour faire savoir que la fonction
// existe et se débloque, sans qu'elle mène nulle part. Contrairement à un
// module fermé chez un client accompagné, qui reste invisible.
function LockedNavItem({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div
      aria-disabled="true"
      title="Disponible avec l'accès complet"
      className="flex cursor-not-allowed select-none items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] text-slate-400"
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      <Lock className="h-3 w-3 shrink-0" />
    </div>
  );
}

function NavGroupLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </div>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  // Rendu par le serveur (AppShell) ; repli sur /api/chrome sans lui.
  const chrome = useChromeState();
  const orgStatus: OrgStatus | null = chrome;
  // Vue manager des deals (Deal Execution) : organisations en phase de test.
  const dealsEnabled = chrome?.dealMemory === true;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fermeture du tiroir à chaque navigation — sinon il reste ouvert par-dessus
  // la nouvelle page après un tap sur un lien.
  //
  // Ajusté PENDANT le rendu et non dans un effet : un effet peint d'abord la
  // nouvelle page tiroir ouvert, puis le referme au tour suivant, ce qui donne
  // un battement visible sur mobile. C'est le motif « Adjusting state during
  // render » de la doc React, déjà retenu pour le bug #8.
  const [pathAtRender, setPathAtRender] = useState(pathname);
  if (pathAtRender !== pathname) {
    setPathAtRender(pathname);
    setMobileOpen(false);
  }

  const userName = session?.user?.name ?? "Jean Dupont";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userEmail = session?.user?.email ?? "";

  const isManager = session?.role === "manager";
  // Inscription libre : Brief seul, plus l'encart pour contacter Hubert. Les
  // entrées de l'accès complet n'apparaissent qu'une fois `false` confirmé
  // (cf. ModulesProvider).
  const { briefsOnly, isEnabled } = useModules();
  const fullAccess = briefsOnly === false;

  // « Performance » regroupe Vue d'ensemble + Historique + Entraînement,
  // navigables en onglets (app/components/PerformanceTabs.tsx) — Objections
  // reste dans Paramètres.
  const performanceActive =
    pathname.startsWith("/dashboard") || pathname.startsWith("/contacts") || pathname.startsWith("/training");
  // Sections propres depuis le 15/10/2026 (ex-onglets Performance et
  // Paramètres), sous l'entrée Équipe. Chacune n'existe que si son module est
  // ouvert ; « Playbook & objections » mène à la grille, ou aux objections
  // quand seul ce module est ouvert.
  const playbookHref = isEnabled("playbook") ? "/playbook" : isEnabled("objections") ? "/playbook/objections" : null;
  const resourcesGroup: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    ...(playbookHref ? [{ href: playbookHref, label: "Playbook & objections", icon: BookOpen, active: pathname.startsWith("/playbook") }] : []),
    ...(isEnabled("references") ? [{ href: "/references", label: "Références clients", icon: Library, active: pathname.startsWith("/references") }] : []),
  ];
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
    ...(fullAccess
      ? [
          { href: "/feedback", label: "Analyse rendez-vous", icon: Video, active: feedbackActive },
          { href: "/dashboard", label: "Performance", icon: LayoutDashboard, active: performanceActive },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile trigger — fixed, only shown below lg where the sidebar is
          hidden by default. Lives here (not in TopBar) so this component
          stays fully self-contained on mobile, no cross-component state. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="brief-ui fixed top-3 left-3 z-30 grid h-10 w-10 place-items-center rounded-lg border border-border bg-white text-slate-600 shadow-[var(--shadow-sm)] lg:hidden"
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
        className={`brief-ui fixed left-0 top-0 h-full w-60 bg-white border-r border-border flex flex-col z-40 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0">
        <Link href={fullAccess ? "/dashboard" : "/brief"} className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Le logo de l'entreprise du client, son nom en titre (demande de
              Jean, 14/10/2026) ; « Brief » passe en sous-titre, avec la
              mention de la version gratuite le cas échéant. Repli sur le « B »
              tant que l'entreprise n'est pas connue ou sans logo trouvé. */}
          {orgStatus?.organizationName ? (
            <CompanyLogo
              domain={companyDomainFromEmail(userEmail)}
              name={orgStatus.organizationName}
              alt={orgStatus.organizationName}
              className="h-9 w-9 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-slate-200"
              fallback={
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--lavender)] text-[15px] font-semibold text-[color:var(--violet)]">
                  {orgStatus.organizationName.charAt(0).toUpperCase()}
                </div>
              }
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--primary)] text-white text-[14px] font-semibold shrink-0">
              B
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              {orgStatus?.organizationName ?? "Brief"}
            </div>
            {orgStatus?.organizationName && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                Brief
                {briefsOnly && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-800">Version gratuite</span>
                )}
              </div>
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
            {briefsOnly && (
              <>
                <LockedNavItem label="Analyse rendez-vous" icon={Video} />
                <LockedNavItem label="Performance" icon={LayoutDashboard} />
              </>
            )}
          </div>
        </div>

        {/* Équipe (manager only) — lien unique ; les sous-pages se naviguent
            via des onglets en haut de /team (TeamTabs.tsx). */}
        {isManager && fullAccess && (
          <div>
            <NavGroupLabel>Manager</NavGroupLabel>
            <div className="space-y-0.5">
              {dealsEnabled && <NavLink href="/deals" label="Deals" icon={Target} active={pathname.startsWith("/deals")} />}
              <NavLink href="/team" label="Équipe" icon={Users} active={teamActive} />
            </div>
          </div>
        )}

        {/* Méthode de vente partagée par l'équipe : la grille et les
            objections, les références clients (15/10/2026). */}
        {fullAccess && resourcesGroup.length > 0 && (
          <div>
            <NavGroupLabel>Méthode</NavGroupLabel>
            <div className="space-y-0.5">
              {resourcesGroup.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={item.active} />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom — help, settings, sign out, user */}
      <div className="px-3 py-3 space-y-0.5 shrink-0 border-t border-border">
        {briefsOnly && <TalkToSales variant="compact" />}

        {orgStatus?.billingStatus === "trialing" && orgStatus.trialEndsAt && (
          <div className="mb-2 rounded-xl bg-[color:var(--lavender)] p-3">
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

        {fullAccess && (
        <Link
          href="/help"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
            helpActive ? "bg-[color:var(--lavender)] font-medium text-[color:var(--violet)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
          Aide
        </Link>
        )}

        {/* /settings/general et non /settings : la racine ne fait que
            rediriger, et elle est hors des pages ouvertes en accès « briefs ». */}
        <Link
          href="/settings/general"
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors ${
            settingsActive ? "bg-[color:var(--lavender)] font-medium text-[color:var(--violet)]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Paramètres
        </Link>

        <button
          onClick={() => {
            // Ancienne copie locale de l'agenda (retirée le 14/10/2026, la page
            // est désormais remplie par le serveur) : on nettoie ce qui reste.
            try {
              localStorage.removeItem("brief:agenda");
            } catch {}
            signOut({ callbackUrl: "/" });
          }}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Déconnexion
        </button>

        {/* User card */}
        <div className="mt-2 flex items-center gap-2.5 border-t border-border px-1 pt-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--lavender)] text-[color:var(--violet)] text-[11px] font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-slate-900 leading-tight truncate">{userName}</p>
            {userEmail && <p className="text-[11.5px] text-slate-500 truncate">{userEmail}</p>}
          </div>
        </div>
      </div>
      </aside>
    </>
  );
}
