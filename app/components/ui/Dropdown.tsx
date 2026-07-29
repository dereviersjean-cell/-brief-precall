"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

// Menu déroulant du design system. Remplace `<select>` partout où le menu est
// visible par l'utilisateur : le rendu natif d'un `<select>` est celui de l'OS
// (surbrillance bleue système, coins carrés, police système) et jure avec le
// reste de l'interface — c'est particulièrement visible sur macOS.
//
// Dans un fichier séparé de ui-bits.tsx, qui n'est pas un client component :
// y mettre un composant à hooks forcerait « use client » sur tout le fichier
// et casserait son utilisation depuis les server components.

export type DropdownOption = { value: string; label: string };

export default function Dropdown({
  options,
  value,
  onChange,
  icon,
  prefix,
  ariaLabel,
  className = "",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  // Libellé fixe devant la valeur (« Vue : Équipe ») — dans le bouton plutôt
  // qu'un <label> à côté, pour que l'ensemble reste une seule cible cliquable.
  prefix?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à Échap — les deux comportements qu'un
  // <select> natif offrait gratuitement et qu'il faut réimplémenter ici.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value) ?? options[0] ?? null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="inline-flex h-9 w-full items-center gap-2 rounded-xl border border-border bg-white px-3.5 text-left shadow-[var(--shadow-xs)] transition-colors hover:bg-slate-50"
      >
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
        {prefix && <span className="shrink-0 text-[12.5px] text-slate-500">{prefix}</span>}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900">{selected?.label ?? ""}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        // z-20 : au-dessus de la TopBar (z-10) et des barres d'onglets
        // collantes (z-9), qui passeraient sinon par-dessus le menu.
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-72 min-w-full overflow-y-auto rounded-xl border border-border bg-white p-1 shadow-[var(--shadow-md)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-[color:var(--lavender)] font-medium text-[color:var(--violet)]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${active ? "opacity-100" : "opacity-0"}`} />
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
