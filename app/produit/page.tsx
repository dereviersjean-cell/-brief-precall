import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, MethodSection, WeekSection, ManagerSection, FinalCTA } from "@/app/components/landing/sections";

export const metadata: Metadata = {
  title: "Produit · Brief",
  description: "Brief prépare chaque rendez-vous, débriefe chaque call selon votre méthode et fait avancer chaque deal : briefs, analyse des calls, suivi des deals, méthode de vente et bilan hebdomadaire.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        art="/landing/art-produit.jpg"
        ink="#27387A"
        label="Produit"
        title="Préparer, débriefer, progresser :"
        accent="tout le cycle de vente au même endroit."
        lead="Un brief prêt la veille de chaque rendez-vous, chaque call débriefé en trois questions, chaque deal suivi avec sa priorité, et une seule méthode pour toute l'équipe."
      />
      <MethodSection />
      <WeekSection />
      <ManagerSection />
      <FinalCTA />
    </SiteChrome>
  );
}
