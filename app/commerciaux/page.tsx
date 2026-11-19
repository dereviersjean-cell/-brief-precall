import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, RepPromises, AudienceStrip, RepJourney, FinalCTA } from "@/app/components/landing/sections";

// Page « Commerciaux » (cadrage GTM d'Hubert, 19/11/2026). Ce qu'elle doit
// vendre : un copilote qui renforce l'expertise du commercial, pas une IA
// qui décide à sa place. Trois bénéfices, dans cet ordre : faire avancer le
// deal, mieux exécuter les rendez-vous, moins d'administratif — portés par
// la séquence collante du site (Journey). Remplace l'ancienne page Produit,
// qui y redirige.

export const metadata: Metadata = {
  title: "Commerciaux · Brief",
  description:
    "Brief s'appuie sur votre méthode commerciale et l'historique de vos échanges pour identifier les points à approfondir, vous suggérer les prochaines actions et vous aider à progresser jusqu'au closing.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        art="/landing/art-produit.jpg"
        ink="#27387A"
        label="Brief pour les commerciaux"
        title="Faites avancer davantage de deals,"
        accent="à chaque étape de votre cycle de vente."
        lead="Brief s'appuie sur votre méthode commerciale et l'historique de vos échanges pour identifier les points à approfondir, vous suggérer les prochaines actions et vous aider à progresser jusqu'au closing."
        cta
      >
        <RepPromises />
      </PageHero>
      <AudienceStrip />
      <RepJourney />
      <FinalCTA body="Découvrez comment Brief peut vous aider à mieux exécuter votre méthode commerciale et à transformer davantage d'opportunités en clients." />
    </SiteChrome>
  );
}
