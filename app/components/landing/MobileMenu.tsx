"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

// Menu de la landing sous `md`. La barre de navigation desktop masque ses
// ancres en dessous de 768 px : sans ce tiroir, un visiteur sur téléphone
// n'avait aucun moyen d'atteindre FAQ, Intégrations, etc. autrement qu'en
// faisant défiler toute la page.
export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="landing-mobile-menu"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-full text-land-ink hover:bg-land-sunken active:scale-[0.97] transition-transform"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav
          id="landing-mobile-menu"
          aria-label="Menu principal"
          className="absolute inset-x-0 top-full border-b border-land-line bg-land-bg px-4 pb-6 pt-2 shadow-[var(--land-shadow)]"
        >
          <ul className="divide-y divide-land-line">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-[16px] font-medium text-land-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-4 flex h-11 items-center justify-center rounded-full border border-land-line text-[15px] font-medium text-land-ink"
          >
            Se connecter
          </Link>
        </nav>
      )}
    </div>
  );
}
