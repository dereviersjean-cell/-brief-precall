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
type ModulesState = { loaded: boolean; isEnabled: (key: ModuleKey) => boolean };

const ModulesContext = createContext<ModulesState>({ loaded: false, isEnabled: () => false });

export function ModulesProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [modules, setModules] = useState<ModuleKey[] | null>(null);

  const load = useCallback(() => {
    fetch("/api/modules", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { modules?: ModuleKey[] } | null) => {
        if (data?.modules) setModules(data.modules);
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

  return <ModulesContext.Provider value={{ loaded: modules !== null, isEnabled }}>{children}</ModulesContext.Provider>;
}

export function useModules(): ModulesState {
  return useContext(ModulesContext);
}
