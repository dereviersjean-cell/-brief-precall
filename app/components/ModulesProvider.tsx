"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { ModuleKey } from "@/lib/modules";

// Modules actifs côté interface (voir lib/modules.ts). Tant que la liste n'est
// pas chargée, un module est tenu pour INACTIF : mieux vaut qu'un onglet
// apparaisse une fraction de seconde plus tard qu'un module encore fermé
// s'affiche puis disparaisse sous les yeux du client.
//
// Relu quand la fenêtre reprend le focus : pendant le point hebdomadaire,
// l'account manager active un module, le client revient sur son onglet et le
// voit apparaître — sans recharger.
//
// `briefsOnly` : inscription libre (lib/modules.ts), seule la page Brief
// existe. Tant que ce n'est pas chargé, il vaut `null` : ce qui n'existe
// qu'en accès complet ne s'affiche qu'une fois `false` confirmé, même règle
// que pour un module.
type ModulesState = { loaded: boolean; isEnabled: (key: ModuleKey) => boolean; briefsOnly: boolean | null };

const ModulesContext = createContext<ModulesState>({ loaded: false, isEnabled: () => false, briefsOnly: null });

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [modules, setModules] = useState<ModuleKey[] | null>(null);
  const [briefsOnly, setBriefsOnly] = useState<boolean | null>(null);

  const load = useCallback(() => {
    fetch("/api/modules", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { modules?: ModuleKey[]; briefsOnly?: boolean } | null) => {
        if (data?.modules) setModules(data.modules);
        if (typeof data?.briefsOnly === "boolean") setBriefsOnly(data.briefsOnly);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [status, load]);

  const isEnabled = useCallback((key: ModuleKey) => modules?.includes(key) ?? false, [modules]);

  return <ModulesContext.Provider value={{ loaded: modules !== null, isEnabled, briefsOnly }}>{children}</ModulesContext.Provider>;
}

export function useModules(): ModulesState {
  return useContext(ModulesContext);
}
