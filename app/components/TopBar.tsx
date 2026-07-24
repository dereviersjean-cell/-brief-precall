"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Bell, ChevronRight } from "lucide-react";

// Porté du mockup Lovable (app-shell.tsx TopBar), juillet 2026. Recherche
// volontairement désactivée (pas de moteur de recherche global côté
// serveur) plutôt que de simuler un champ fonctionnel qui ne ferait rien.
const LABELS: Record<string, string> = {
  dashboard: "Performance",
  brief: "Brief",
  feedback: "Analyse rendez-vous",
  contacts: "Historique",
  settings: "Paramètres",
  notifications: "Notifications",
  objections: "Objections",
  team: "Équipe",
  playbook: "Playbook",
  "email-templates": "Templates emails",
  insights: "Insights",
  "meeting-stages": "Étapes de RDV",
  general: "Général",
  connexions: "Connexions",
  crm: "CRM",
  references: "Références clients",
  billing: "Facturation",
  help: "Aide",
  calls: "Calls",
};

function isLikelyId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^[a-z0-9_-]{20,}$/i.test(segment);
}

function buildCrumbs(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = ["Brief"];
  if (parts.length === 0) {
    crumbs.push("Performance");
    return crumbs;
  }
  for (const p of parts) {
    if (LABELS[p]) {
      crumbs.push(LABELS[p]);
    } else if (!isLikelyId(p)) {
      crumbs.push(decodeURIComponent(p));
    }
  }
  return crumbs;
}

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const crumbs = buildCrumbs(pathname);

  const userName = session?.user?.name ?? "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="brief-ui sticky top-0 z-10 border-b border-border/80 bg-white/70 backdrop-blur-xl">
      <div className="h-14 flex items-center gap-4 pl-16 pr-4 lg:px-10">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-slate-500 min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
              <span className={i === crumbs.length - 1 ? "text-slate-900 font-medium truncate" : "truncate"}>{c}</span>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden lg:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              disabled
              placeholder="Recherche bientôt disponible…"
              title="Recherche globale — bientôt disponible"
              className="h-9 w-[280px] rounded-lg border border-border bg-white/60 pl-8 pr-3 text-[12.5px] text-slate-400 outline-none cursor-not-allowed"
            />
          </div>
          <Link
            href="/notifications"
            title="Notifications"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
          >
            <Bell className="h-4 w-4" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <Link
            href="/settings"
            title="Paramètres"
            className="grid h-8 w-8 place-items-center rounded-full brand-gradient text-white text-[11px] font-semibold shrink-0"
          >
            {userInitials || "?"}
          </Link>
        </div>
      </div>
    </div>
  );
}
