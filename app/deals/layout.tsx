import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

// Vue manager des deals (Deal Execution, étape 4, 27/10/2026) : les deals où
// intervenir, le parcours étape par étape, l'équipe. Phase de test : managers
// des organisations où la fiche deal est ouverte.
export default function DealsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 ml-0 lg:ml-60 min-w-0">
          <ImpersonationBanner />
          <BillingGraceBanner />
          <TopBar />
          <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
              <PageHeader
                eyebrow="Manager · test"
                title="Deals à suivre"
                subtitle="Les deals où votre intervention peut compter, d'après les derniers calls de votre équipe."
              />
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
