import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, ManagerRadarSection, ExecutionSection, FinalCTA } from "@/app/components/landing/sections";

// Page « Directeurs commerciaux et dirigeants » (cadrage GTM d'Hubert,
// 19/11/2026). Ce qu'elle doit vendre : Brief aide le manager à concentrer
// ses interventions là où elles peuvent changer l'issue d'un deal. D'abord
// les opportunités à risque (« Suivi des deals », le Manager Radar du
// cadrage), puis l'exécution du playbook et la performance.
// Le haut de page est sans illustration : l'écran produit vient juste
// dessous, comme sur la maquette.

export const metadata: Metadata = {
  title: "Directeurs commerciaux et dirigeants · Brief",
  description:
    "Brief vous donne la visibilité, les analyses et les recommandations pour savoir où agir, lever la progression des opportunités et améliorer la conversion de votre équipe.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        label="Pour les directeurs commerciaux et dirigeants"
        title="Identifiez les deals sur lesquels votre intervention"
        accent="peut faire la différence."
        lead="Brief vous donne la visibilité, les analyses et les recommandations pour savoir où agir, lever la progression des opportunités et améliorer la conversion de votre équipe."
        cta
      />
      <ManagerRadarSection />
      <ExecutionSection />
      <FinalCTA />
    </SiteChrome>
  );
}
