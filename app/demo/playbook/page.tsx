import { BookOpen, Gauge, Layers, ListChecks } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card } from "@/app/components/ui/ui-bits";
import FadeIn from "@/app/dashboard/FadeIn";
import { demoPlaybook } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// Version lecture seule du playbook. PlaybookClient est un composant d'édition
// (appels PATCH/DELETE sur chaque champ) : le rendre ici brancherait des
// boutons sur des routes qui refuseraient l'écriture. On reprend donc la
// présentation, sans aucune commande — ce qui correspond d'ailleurs à ce que
// voit un commercial sur la vraie page.
export default function DemoPlaybookPage() {
  const totalQuestions = demoPlaybook.dimensions.reduce((sum, d) => sum + d.criteria.length, 0);
  const totalWeight = demoPlaybook.dimensions.reduce((sum, d) => sum + d.weight, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <FadeIn>
        <div className="mb-6">
          <PageHeader
            eyebrow="Performance"
            title="Playbook"
            subtitle="La grille sur laquelle chaque rendez-vous est noté. Définie par le manager, consultable par toute l'équipe."
          />
        </div>
      </FadeIn>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          [Layers, "Dimensions", demoPlaybook.dimensions.length],
          [ListChecks, "Questions au total", totalQuestions],
          [Gauge, "Poids total", totalWeight],
        ].map(([Icon, label, value]) => {
          const IconComponent = Icon as typeof Layers;
          return (
            <Card key={label as string} padded={false} className="p-5">
              <div className="flex items-center gap-2 text-slate-400">
                <IconComponent className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{label as string}</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value as number}</p>
            </Card>
          );
        })}
      </div>

      <FadeIn delay={0.1}>
        <div className="space-y-4">
          {demoPlaybook.dimensions.map((dimension, index) => (
            <Card key={dimension.id} padded={false} className="p-5" data-tour={index === 0 ? "demo-playbook" : undefined}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{dimension.label}</p>
                  {dimension.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{dimension.description}</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  poids {dimension.weight}
                </span>
              </div>

              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {dimension.criteria.map((criterion) => (
                  <li key={criterion.id} className="flex gap-2 text-sm text-slate-700">
                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                    {criterion.question}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </FadeIn>

      <p className="mt-5 text-xs text-slate-400">
        Le poids détermine l&apos;importance de chaque dimension dans la note globale. Ici le traitement des objections
        pèse autant que la découverte.
      </p>
    </div>
  );
}
