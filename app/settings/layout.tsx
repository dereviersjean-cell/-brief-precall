import AppSidebar from "@/app/components/AppSidebar";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import SettingsTabs from "./_components/SettingsTabs";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 min-w-0 bg-background">
        <BillingGraceBanner />
        <div className="max-w-4xl mx-auto px-10 py-10">
          <PageHeader eyebrow="Compte" title="Paramètres" subtitle="Configurez votre profil commercial, vos intégrations et votre abonnement." />
          <div className="mt-6">
            <SettingsTabs />
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
