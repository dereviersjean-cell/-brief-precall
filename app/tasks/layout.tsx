import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TasksOverdueToast from "./TasksOverdueToast";
import type { ReactNode } from "react";

export default function TasksLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TasksOverdueToast />
        {children}
      </div>
    </div>
  );
}
