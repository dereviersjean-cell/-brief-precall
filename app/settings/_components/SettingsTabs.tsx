"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings, Link as LinkIcon, Library, CreditCard, MessagesSquare, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Onglets retirés le 21/08/2026, à la demande de Jean — les PAGES existent
// toujours et restent accessibles par URL directe, seul l'onglet disparaît :
//   - CRM : son contenu a rejoint Connexions, tout se connecte au même endroit
//   - Tester un call (/settings/import-call) : banc d'essai, pas un réglage
//   - Calibrage (/settings/calibrage) : chantier objections en standby
// Remettre un onglet = remettre sa ligne ici, rien d'autre à défaire.
// Objections a rejoint Paramètres depuis Performance (recentrage produit,
// 24 juillet 2026) — ouverte à tous (pas managerOnly), comme avant.
const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; managerOnly?: boolean }[] = [
  { href: "/settings/general", label: "Général", icon: Settings },
  { href: "/settings/connexions", label: "Connexions", icon: LinkIcon },
  // « Références clients » raccourci en « Références » : avec l'ajout de
  // « Tester un call », la barre débordait de son conteneur max-w-4xl et
  // faisait apparaître une barre de défilement sous les onglets.
  { href: "/settings/references", label: "Références", icon: Library },
  { href: "/settings/objections", label: "Objections", icon: MessagesSquare },
  // Réglage d'organisation, arrivé de /team le 04/09/2026. managerOnly : la
  // page elle-même redirige déjà un commercial, l'onglet ne doit pas lui
  // promettre un écran qu'il ne peut pas ouvrir.
  { href: "/settings/email-templates", label: "Templates emails", icon: Mail, managerOnly: true },
  { href: "/settings/billing", label: "Facturation", icon: CreditCard, managerOnly: true },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isManager = session?.role === "manager";

  const items = NAV_ITEMS.filter((item) => !item.managerOnly || isManager);

  return (
    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-border">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative inline-flex items-center gap-2 whitespace-nowrap px-3.5 h-11 text-[13px] font-medium transition-colors ${
              active ? "text-[color:var(--violet)]" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full brand-gradient" />}
          </Link>
        );
      })}
    </nav>
  );
}
