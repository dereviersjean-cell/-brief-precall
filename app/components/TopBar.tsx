"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, ChevronRight } from "lucide-react";
import GlobalSearch from "./GlobalSearch";

// Porté du mockup Lovable (app-shell.tsx TopBar), juillet 2026. Le champ de
// recherche est resté désactivé jusqu'au 31/07/2026 — il est maintenant
// fonctionnel (GlobalSearch.tsx).
const LABELS: Record<string, string> = {
  dashboard: "Performance",
  brief: "Brief",
  feedback: "Analyse rendez-vous",
  training: "Entraînement",
  contacts: "Historique",
  settings: "Paramètres",
  notifications: "Notifications",
  objections: "Objections",
  team: "Équipe",
  playbook: "Playbook",
  "email-templates": "Templates emails",
  insights: "Insights",
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
          <GlobalSearch />
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
