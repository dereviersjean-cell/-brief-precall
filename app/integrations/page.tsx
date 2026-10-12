import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero, Integrations, FinalCTA } from "@/app/components/landing/sections";

export const metadata: Metadata = {
  title: "Intégrations · Brief",
  description: "Brief se branche sur Google Agenda, Outlook, Meet, Teams, Zoom, Gmail, HubSpot, Pipedrive, Slack et Notion : briefs et analyses arrivent là où vos commerciaux travaillent déjà.",
};

export default function Page() {
  return (
    <SiteChrome>
      <PageHero
        art="/landing/art-integrations.jpg"
        ink="#314893"
        label="Intégrations"
        title="Se branche sur votre stack."
        accent="Rien de plus à ouvrir le matin."
        lead="Agenda, visio, CRM, email, Slack, playbook : Brief prend ce dont il a besoin dans vos outils et y dépose ce qu'il produit."
      />
      <Integrations showTitle={false} />
      <FinalCTA />
    </SiteChrome>
  );
}
