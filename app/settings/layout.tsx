import AppSidebar from "@/app/components/AppSidebar";
import AppShell from "@/app/components/AppShell";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import SettingsTabs from "./_components/SettingsTabs";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0 bg-background">
        <BillingGraceBanner />
        <TopBar />
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <PageHeader eyebrow="Compte" title="Paramètres" subtitle="Configurez votre profil commercial, vos intégrations et votre abonnement." />
          <div className="mt-6">
            <SettingsTabs />
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
