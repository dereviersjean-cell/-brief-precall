import AppSidebar from "@/app/components/AppSidebar";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0">
        {children}
      </div>
    </div>
  );
}
