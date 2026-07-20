"use client";

import { Sparkles, Database, ScanSearch, Target, ArrowRight } from "lucide-react";
import FadeIn from "@/app/dashboard/FadeIn";
import ClientReferencesSection from "./ClientReferencesSection";

const PIPELINE_STEPS = [
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
      {/* Hero header — explains why this data matters and how it's used */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
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
            <h1 className="text-2xl font-bold text-slate-900">Références clients</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
              Plus votre base de cas clients est riche et précise, plus Brief peut rapprocher un nouveau prospect
              d&apos;une situation que vous avez déjà réussie — et le glisser directement dans le brief généré.
              Chaque référence est convertie en <span className="font-medium text-slate-900">empreinte vectorielle</span>{" "}
              (embedding) : au moment de préparer un rendez-vous, Brief compare mathématiquement le secteur et le
              contexte du prospect à ces empreintes pour retrouver, en une fraction de seconde, vos cas les plus
              similaires. Une référence incomplète ou sans empreinte ne sera jamais retenue, même si elle est
              pertinente — d&apos;où l&apos;intérêt de garder cette base à jour et bien renseignée.
            </p>

            {/* Mini pipeline */}
            <div className="flex items-stretch gap-2 mt-6 flex-wrap">
              {PIPELINE_STEPS.map((step, i) => {
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
                    {i < PIPELINE_STEPS.length - 1 && (
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

      <ClientReferencesSection />
    </div>
  );
}
