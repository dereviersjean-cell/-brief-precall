import AppSidebar from "@/app/components/AppSidebar";
import SettingsNav from "./_components/SettingsNav";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10 flex gap-8 items-start">
          <SettingsNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
