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
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-[color:var(--lavender-strong)]/60 via-[color:var(--lavender)]/40 to-transparent blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
            <Sparkles className="w-3 h-3" />
            Comment ça marche
          </span>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">{children}</p>

          <div className="flex items-stretch gap-2 mt-6 flex-wrap">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-stretch gap-2 flex-1 min-w-[180px]">
                  <div className="flex-1 bg-gradient-to-br from-white to-slate-50/60 border border-border rounded-2xl p-4">
                    <span className="w-8 h-8 rounded-lg brand-gradient text-white flex items-center justify-center shadow-[var(--shadow-glow)] mb-2">
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden sm:flex items-center shrink-0">
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
