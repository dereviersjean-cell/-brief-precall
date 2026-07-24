import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import PerformanceTabs from "@/app/components/PerformanceTabs";
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
        {children}
      </div>
    </div>
  );
}
