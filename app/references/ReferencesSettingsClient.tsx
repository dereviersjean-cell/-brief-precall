"use client";

import { Database, ScanSearch, Target } from "lucide-react";
import HowItWorksCard, { type PipelineStep } from "@/app/settings/_components/HowItWorksCard";
import ClientReferencesSection from "./ClientReferencesSection";

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: Database,
    title: "Vos références",
    description: "Cas clients passés : secteur, problématique, solution mise en place, résultat chiffré.",
  },
  {
    icon: ScanSearch,
    title: "Vectorisation sémantique",
    description: "Chaque référence devient une empreinte à 1024 dimensions (Voyage AI, modèle voyage-3).",
  },
  {
    icon: Target,
    title: "Brief le plus pertinent",
    description: "Le contexte du prospect est comparé à votre portfolio pour ressortir vos cas les plus proches.",
  },
];

export default function ReferencesSettingsClient() {
  return (
    <div>
      <HowItWorksCard title="Références clients" steps={PIPELINE_STEPS}>
        Plus votre base de cas clients est riche et précise, plus Brief peut rapprocher un nouveau prospect
        d&apos;une situation que vous avez déjà réussie — et le glisser directement dans le brief généré.
        Chaque référence est convertie en <span className="font-medium text-slate-900">empreinte vectorielle</span>{" "}
        (embedding) : au moment de préparer un rendez-vous, Brief compare mathématiquement le secteur et le
        contexte du prospect à ces empreintes pour retrouver, en une fraction de seconde, vos cas les plus
        similaires. Une référence incomplète ou sans empreinte ne sera jamais retenue, même si elle est
        pertinente — d&apos;où l&apos;intérêt de garder cette base à jour et bien renseignée.
      </HowItWorksCard>

      <ClientReferencesSection />
    </div>
  );
}
