import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, SecurityContent, FinalCTA } from "@/app/components/landing/sections";

export const metadata: Metadata = {
  title: "Sécurité et données · Brief",
  description: "Hébergement à Paris et Francfort, vidéo jamais conservée, participants informés, aucune lecture de vos emails : comment Brief protège les données de votre équipe commerciale.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        art="/landing/art-securite.jpg"
        ink="#1F308B"
        label="Sécurité et données"
        title="Vos calls, vos données."
        accent="Protégés."
        lead="Hébergement européen, participants informés, aucune lecture de vos emails, cloisonnement par rôle : ce que Brief fait de vos données, et ce qu'il ne fait pas."
      />
      <SecurityContent />
      <FinalCTA />
    </SiteChrome>
  );
}
