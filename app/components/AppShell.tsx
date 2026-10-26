import type { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getImpersonationTarget } from "@/lib/impersonation";
import { getActiveSeatCountForOrganization, getShellStateForUser } from "@/lib/db";
import type { ChromeState } from "@/lib/chrome-state";
import { ShellProvider } from "./ShellProvider";
import { ModulesProvider } from "./ModulesProvider";

// Tout ce que l'habillage de l'app affiche — nom et logo de l'entreprise,
// bannières de facturation et d'impersonation, modules ouverts — lu par le
// serveur en UNE requête et rendu avec la page. Avant (jusqu'au 15/10/2026),
// le navigateur appelait /api/chrome, /api/modules (et /api/onboarding sur
// Brief) après chaque chargement : trois fonctions Vercel réveillées à froid,
// pour un nom d'organisation et des onglets. Monté dans chaque layout de
// section ; les écrans sans lui gardent les appels d'avant (ShellProvider,
// ModulesProvider).
export default async function AppShell({ children }: { children: ReactNode }) {
  // Impersonation d'abord : la bannière rouge doit marcher avec le seul cookie
  // admin, sans session (règle de /api/chrome).
  const [impersonationTarget, session] = await Promise.all([
    getImpersonationTarget().catch(() => null),
    getServerSession(authOptions).catch(() => null),
  ]);
  const userId = impersonationTarget?.id ?? session?.supabaseUserId ?? null;
  const state = userId ? await getShellStateForUser(userId).catch(() => null) : null;
  // Le nombre de sièges ne s'affiche que sur la carte d'essai.
  const seatCount =
    state?.billingStatus === "trialing" && state.organizationId
      ? await getActiveSeatCountForOrganization(state.organizationId).catch(() => 0)
      : 0;

  const chrome: ChromeState | null = state
    ? {
        impersonation: impersonationTarget
          ? { active: true, targetUserName: impersonationTarget.name ?? impersonationTarget.email }
          : { active: false },
        organizationName: state.organizationName,
        billingStatus: state.billingStatus ?? "none",
        trialEndsAt: state.trialEndsAt,
        graceEndsAt: state.graceEndsAt,
        seatCount,
        dealMemory: state.dealMemoryEnabled,
      }
    : null;
  const modules = state ? { modules: state.modules, briefsOnly: state.accessLevel === "briefs" } : null;

  return (
    <ShellProvider chrome={chrome}>
      <ModulesProvider initial={modules}>{children}</ModulesProvider>
    </ShellProvider>
  );
}
