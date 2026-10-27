import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import type { ReactNode } from "react";

// Page d'un deal (Deal Execution, 27/10/2026) : ouverte depuis « Mes deals »
// par le commercial, depuis « Deals » par le manager.
export default function DealLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 ml-0 lg:ml-60 min-w-0">
          <ImpersonationBanner />
          <BillingGraceBanner />
          <TopBar />
          <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
