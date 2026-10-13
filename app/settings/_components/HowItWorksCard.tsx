import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles, ArrowRight } from "lucide-react";
import FadeIn from "@/app/dashboard/FadeIn";

export type PipelineStep = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Titre en h2 et non h1 : le layout des paramètres rend déjà un h1
// (« Paramètres ») au-dessus de chaque onglet.
export default function HowItWorksCard({
  title,
  steps,
  children,
}: {
  title: string;
  steps: PipelineStep[];
  children: ReactNode;
}) {
  return (
    <FadeIn>
      <div className="mb-6 rounded-2xl border border-border bg-white p-5 sm:p-7">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
          <Sparkles className="h-3.5 w-3.5" />
          Comment ça marche
        </span>
        <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">{title}</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">{children}</p>

        {/* Une colonne sous `sm`, les étapes côte à côte au-delà. */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex min-w-0 flex-1 items-stretch gap-2">
                <div className="flex-1 rounded-xl bg-[color:var(--lavender)] p-4">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[color:var(--violet)]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="mt-3 text-[13.5px] font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden shrink-0 items-center sm:flex">
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}
