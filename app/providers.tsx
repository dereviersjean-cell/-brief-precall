"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ModulesProvider } from "./components/ModulesProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ModulesProvider>{children}</ModulesProvider>
    </SessionProvider>
  );
}
