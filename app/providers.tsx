"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ModulesProvider } from "./components/ModulesProvider";
import RouterFreshness from "./components/RouterFreshness";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModulesProvider>
        <RouterFreshness />
        {children}
      </ModulesProvider>
    </SessionProvider>
  );
}
