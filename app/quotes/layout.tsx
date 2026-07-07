import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import QuoteAcceptanceToast from "./QuoteAcceptanceToast";
import type { ReactNode } from "react";

export default function QuotesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0">
        <ImpersonationBanner />
        <QuoteAcceptanceToast />
        {children}
      </div>
    </div>
  );
}
