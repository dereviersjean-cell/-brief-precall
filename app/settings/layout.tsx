import AppSidebar from "@/app/components/AppSidebar";
import SettingsNav from "./_components/SettingsNav";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0 bg-slate-50">
        {/* No mx-auto: unlike single-column pages (dashboard, team), this is
            a nav rail + content pair — centering the pair in the remaining
            viewport pushes it far from the app sidebar it should sit next
            to. Left-aligned with a fixed inset instead. */}
        <div className="max-w-4xl px-10 py-10 flex gap-8 items-start">
          <SettingsNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
