import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import type { ReactNode } from "react";

// Méthode (05/11/2026, maquette G1 B choisie par Jean) : une seule page pour
// les objectifs par rendez-vous, les objections et les références clients.
export default function MethodeLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 ml-0 lg:ml-60 min-w-0">
          <ImpersonationBanner />
          <BillingGraceBanner />
          <TopBar />
          <div style={{ background: "linear-gradient(180deg, oklch(0.965 0.022 270) 0px, var(--background) 520px)" }}>{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
