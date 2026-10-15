"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import RouterFreshness from "./components/RouterFreshness";

// Les modules et l'habillage sont fournis par AppShell dans chaque layout de
// section (rendus par le serveur), plus ici : au niveau racine, un
// ModulesProvider aurait appelé /api/modules sur toutes les pages, site
// public compris.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <RouterFreshness />
      {children}
    </SessionProvider>
  );
}
