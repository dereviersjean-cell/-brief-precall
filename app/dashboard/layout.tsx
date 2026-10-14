import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import PerformanceTabs from "@/app/components/PerformanceTabs";
import GuidedTour from "@/app/components/GuidedTour";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        <PerformanceTabs />
        {/* Haut de page teinté, comme Brief : les onglets de Performance
            partagent le même fond que le reste de l'app. */}
        <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>{children}</div>
        {/* Ne se déclenche que sur ?tour=1 — voir GuidedTour. */}
        <GuidedTour />
      </div>
    </div>
  );
}
