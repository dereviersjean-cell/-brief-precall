import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

// Vue commercial « Mes deals » (Deal Execution, 27/10/2026) : l'évolution de
// chacun de ses deals, call après call. Phase de test : organisations où la
// fiche deal est ouverte.
export default function MesDealsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 ml-0 lg:ml-60 min-w-0">
          <ImpersonationBanner />
          <BillingGraceBanner />
          <TopBar />
          {/* Fond chaud de la version « coach » (D3, choisie par Jean le 27/10/2026). */}
          <div className="min-h-screen bg-[#f7f6f3]">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
              <PageHeader
                eyebrow="Commercial · test"
                title="Mes deals"
                subtitle="Pour chaque deal, ce que nous vous conseillons de faire maintenant."
              />
              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
