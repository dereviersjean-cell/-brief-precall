import AppSidebar from "@/app/components/AppSidebar";
import ImpersonationBanner from "@/app/components/ImpersonationBanner";
import BillingGraceBanner from "@/app/components/BillingGraceBanner";
import TopBar from "@/app/components/TopBar";
import GuidedTour from "@/app/components/GuidedTour";
import InstallHint from "@/app/components/InstallHint";
import type { ReactNode } from "react";

export default function BriefLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-0 lg:ml-60 min-w-0">
        <ImpersonationBanner />
        <BillingGraceBanner />
        <TopBar />
        {/* Sur /brief uniquement : c'est la première page après connexion,
            donc celle que tout le monde voit — et l'invitation ne s'affiche
            qu'une fois, puis plus jamais. La mettre dans le layout racine la
            ferait apparaître sur des écrans où elle n'a rien à faire. */}
        <InstallHint />
        {children}
        {/* La visite guidée traverse plusieurs pages : elle doit être montée
            dans CHAQUE layout qu'elle visite, sinon la bulle disparaît en
            arrivant (voir la liste des pages dans GuidedTour.tsx). */}
        <GuidedTour />
      </div>
    </div>
  );
}
