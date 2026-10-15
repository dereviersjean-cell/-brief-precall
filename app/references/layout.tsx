import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

// Références clients : page propre depuis le 15/10/2026 (ex-onglet des
// Paramètres), entrée de la barre latérale.
export default function ReferencesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <PageHeader
              eyebrow="Ressources"
              title="Références clients"
              subtitle="Vos cas clients : Brief cite dans chaque brief ceux qui ressemblent le plus au prospect."
            />
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
