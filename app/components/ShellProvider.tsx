"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchJsonOnce } from "@/lib/fetch-once";
import type { ChromeState } from "@/lib/chrome-state";

// L'habillage (nom d'entreprise, facturation, impersonation) rendu par le
// serveur (AppShell) et distribué ici : la barre latérale et les bannières ne
// font plus d'appel /api/chrome au chargement (15/10/2026 — c'était une
// fonction réveillée à froid à chaque page). Sans AppShell au-dessus (écrans
// de démonstration, aperçus), le hook retombe sur l'appel d'avant.
type ShellContext = { provided: boolean; chrome: ChromeState | null };
const Ctx = createContext<ShellContext>({ provided: false, chrome: null });

export function ShellProvider({ chrome, children }: { chrome: ChromeState | null; children: ReactNode }) {
  return <Ctx.Provider value={{ provided: true, chrome }}>{children}</Ctx.Provider>;
}

export function useChromeState(): ChromeState | null {
  const ctx = useContext(Ctx);
  const [fetched, setFetched] = useState<ChromeState | null>(null);
  useEffect(() => {
    if (ctx.provided) return;
    let cancelled = false;
    fetchJsonOnce<ChromeState>("/api/chrome").then((data) => {
      if (!cancelled && data) setFetched(data);
    });
    return () => {
      cancelled = true;
    };
  }, [ctx.provided]);
  return ctx.provided ? ctx.chrome : fetched;
}
