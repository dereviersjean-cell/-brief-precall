import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import type { ReactNode } from "react";

// Historique n'est plus un onglet de Performance (25/07/2026) — /contacts
// reste une page à part entière, atteinte via le lien "Tout l'historique →"
// de la carte Vue d'ensemble, plus via un onglet persistant.
export default function ContactsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        {children}
      </div>
    </div>
  );
}
