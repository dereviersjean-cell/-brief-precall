import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="brief-ui flex-1 ml-60 min-w-0">
        <ImpersonationBanner />
        {children}
      </div>
    </div>
  );
}
