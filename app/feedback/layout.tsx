import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import GuidedTour from "@/app/components/GuidedTour";
import type { ReactNode } from "react";

export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        {children}
        {/* La visite guidée traverse plusieurs pages : elle doit être montée
            dans CHAQUE layout qu'elle visite, sinon la bulle disparaît en
            arrivant (voir la liste des pages dans GuidedTour.tsx). */}
        <GuidedTour />
      </div>
    </div>
  );
}
