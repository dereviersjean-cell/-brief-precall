import type { Metadata } from "next";
import { Header } from "./(marketing)/_components/Header";
import { Hero } from "./(marketing)/_components/Hero";
import { HowItWorks } from "./(marketing)/_components/HowItWorks";
import { Features } from "./(marketing)/_components/Features";
import { Integrations } from "./(marketing)/_components/Integrations";
import { CTASection } from "./(marketing)/_components/CTASection";
import { Footer } from "./(marketing)/_components/Footer";

export const metadata: Metadata = {
  title: "Brief — Le copilote IA de vos rendez-vous commerciaux",
  description:
    "Brief prépare vos rendez-vous, les analyse en temps réel, et automatise vos suivis. Pour équipes commerciales B2B.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <Integrations />
      <CTASection />
      <Footer />
    </div>
  );
}
