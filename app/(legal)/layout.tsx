import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// Pages publiques, non authentifiées (pas dans le matcher de middleware.ts,
// volontairement — un vérificateur Google ou un prospect doit pouvoir les
// lire sans compte). Habillage minimal, cohérent avec la landing/le login,
// mais sans dépendre de leurs composants internes non exportés.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="brief-ui min-h-screen bg-white text-ink">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-white text-[13px] font-semibold shadow-[var(--shadow-glow)]">
              B
            </span>
            <span className="text-[15.5px] font-semibold tracking-tight text-ink">Brief</span>
          </Link>
          <Link href="/" className="group inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Retour au site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">{children}</main>

      <footer className="border-t border-border/60 px-6 py-8">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Brief · édité par Oliverlist</span>
          <div className="flex items-center gap-5">
            <Link href="/mentions-legales" className="hover:text-ink transition-colors">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-ink transition-colors">Confidentialité</Link>
            <a href="mailto:hello@oliverlist.com" className="hover:text-ink transition-colors">Nous contacter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
