import AppShell from "@/app/components/AppShell";
import type { ReactNode } from "react";

// L'onboarding lit les modules (étape Références) : AppShell les fournit,
// rendus par le serveur, comme pour le reste de l'app.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
