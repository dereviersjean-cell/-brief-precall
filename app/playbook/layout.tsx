import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import GuidedTour from "@/app/components/GuidedTour";
import PlaybookTabs from "./_components/PlaybookTabs";
import type { ReactNode } from "react";

// Section « Playbook & objections » (15/10/2026) : ex-onglets Performance ›
// Playbook et Objections, et Paramètres › Objections.
export default function PlaybookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        <PlaybookTabs />
        <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>{children}</div>
        <GuidedTour />
      </div>
    </div>
  );
}
