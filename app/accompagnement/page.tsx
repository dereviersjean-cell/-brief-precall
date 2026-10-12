import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, Testimonials, FinalCTA } from "@/app/components/landing/sections";
import { Accompaniment } from "@/app/components/landing/Accompaniment";

export const metadata: Metadata = {
  title: "Accompagnement · Brief",
  description: "Brief commence par l'outil, puis un coach structure votre équipe commerciale et configure Brief autour de vos besoins : un point par semaine pendant huit semaines.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        art="/landing/art-accompagnement.jpg"
        ink="#28479B"
        label="Accompagnement"
        title="Un outil, puis un coach"
        accent="pour structurer votre équipe."
        lead="Vos commerciaux commencent par les briefs et l'analyse des calls. Ensuite, un coach de l'équipe Brief vous accompagne chaque semaine pour structurer votre organisation commerciale et configurer Brief autour de vos besoins."
      />
      <Accompaniment />
      <Testimonials />
      <FinalCTA />
    </SiteChrome>
  );
}
