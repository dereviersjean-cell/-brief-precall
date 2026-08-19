import AppSidebar from "@/app/components/AppSidebar";
import TopBar from "@/app/components/TopBar";
import GuidedTour from "@/app/components/GuidedTour";
import PerformanceTabs from "@/app/components/PerformanceTabs";
import DemoBanner from "./DemoBanner";
import type { ReactNode } from "react";

// Routes de démonstration : mêmes composants d'affichage que les vraies
// pages, alimentés par lib/demo-data.ts. Les vraies pages ne connaissent pas
// ce dossier — la contamination est structurellement impossible.
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <TopBar />
        <DemoBanner />
        <PerformanceTabs />
        {children}
        <GuidedTour />
      </div>
    </div>
  );
}
