import type { Metadata } from "next";
import { APP_URL } from "@/lib/app-url";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import {
  Hero,
  MethodSection,
  TeamSection,
  AccompanimentTeaser,
  Testimonials,
  Faq,
  FinalCTA,
} from "@/app/components/landing/sections";

// Accueil du site public (découpé en pages le 12/10/2026, sur le modèle de
// lemlist, PayFit et uptoo) : une vitrine courte qui donne envie et renvoie
// au détail — Produit, Accompagnement, Intégrations, Sécurité. La séquence
// animée des trois moments y figure en entier, comme sur Produit (demande de
// Jean du 12/10/2026). Les sections vivent dans
// app/components/landing/sections.tsx.
//
// Typographie française : les espaces avant « : ; ? ! » et à l'intérieur des
// guillemets sont des espaces insécables (U+00A0), invisibles dans l'éditeur.

// Inchangée : c'est aussi la description lue par les robots et par la
// vérification Google (cf. commentaire de `metadata`).
const DESCRIPTION =
  "Brief est une application web pour les équipes commerciales B2B. Elle se connecte à votre agenda Google et à votre messagerie Gmail pour préparer chaque rendez-vous, débriefer chaque call selon votre méthode de vente, et faire circuler ce qui gagne dans toute l'équipe.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  // Titre réduit au seul nom de l'application (20/08/2026). La vérification
  // Google a retenu « the app name shown on your OAuth consent screen does not
  // match the app name on your home page » : le nom déclaré est « Brief », et
  // un titre « Brief — Augmentez le taux de closing… » ne se réduit pas à
  // « Brief » de façon fiable pour un contrôle automatique. La promesse
  // commerciale reste dans le h1 et dans la meta description, que les moteurs
  // lisent tout autant. Coût de référencement nul : au 20/08 la page n'a
  // jamais été explorée par Googlebot. À rétablir une fois la vérification
  // obtenue, si le titre long est jugé préférable.
  title: "Brief",
  description: DESCRIPTION,
  applicationName: "Brief",
  openGraph: {
    // siteName déclare le nom du produit de façon lisible par une machine.
    // Sans lui, le nom de l'app ne se déduit que du texte de la page — c'est
    // exactement le grief « the app name does not match the app name on your
    // home page » renvoyé par la vérification Google en août 2026.
    siteName: "Brief",
    title: "Brief",
    description: DESCRIPTION,
    url: APP_URL,
    type: "website",
    locale: "fr_FR",
  },
};

// Même intention que openGraph.siteName, sous la forme que les robots
// consomment en priorité : une déclaration explicite du nom, de l'objet et
// de l'éditeur de l'application, à la racine du domaine autorisé.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Brief",
  url: APP_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "fr-FR",
  description: DESCRIPTION,
};


export default function HomePage() {
  // L'accueil doit continuer à dire clairement ce que fait Brief et garder le
  // titre « Brief » : c'est la page que la vérification Google consulte.
  return (
    <SiteChrome jsonLd={JSON_LD}>
      <Hero />
      <MethodSection />
      <TeamSection />
      <AccompanimentTeaser />
      <Testimonials />
      <Faq />
      <FinalCTA />
    </SiteChrome>
  );
}
