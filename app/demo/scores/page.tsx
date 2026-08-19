import { Target } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import FadeIn from "@/app/dashboard/FadeIn";
import ScoreTrendChart from "@/app/dashboard/ScoreTrendChart";
import DimensionScores from "@/app/dashboard/DimensionScores";
import { demoTrendWeeks, demoDimensions } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// Mêmes composants que /dashboard/scores (ScoreTrendChart, DimensionScores),
// alimentés par lib/demo-data.ts. Seule la mise en page est reprise ici : la
// page réelle porte en plus le sélecteur de commercial, qui n'a pas de sens
// en démonstration.
export default function DemoScoresPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Performance"
            title="Scores"
            subtitle="Votre progression semaine après semaine, et le détail par dimension du playbook."
          />
        </div>
      </FadeIn>

      <div data-tour="demo-scores" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ScoreTrendChart weeks={demoTrendWeeks} title="Score moyen — 6 dernières semaines" />
        </div>

        <div>
          <FadeIn delay={0.1}>
            <Card padded={false} className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)] shrink-0">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Scores moyens par dimension
                </h2>
              </div>
              <span className="block text-[11px] font-normal text-slate-400 mb-4">26 calls analysés, tous temps</span>
              <DimensionScores dimensions={demoDimensions} />
              <p className="mt-4 border-t border-slate-100 pt-3 text-[11.5px] leading-relaxed text-slate-500">
                La dimension la plus basse indique où travailler en priorité. Ici le traitement des objections, à 2,4 —
                c&apos;est cohérent avec l&apos;onglet Objections.
              </p>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
