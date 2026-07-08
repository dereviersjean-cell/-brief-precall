import { FileText, Video, History, FileCheck, CheckSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: FileText,
    title: "Briefs pré-call intelligents",
    description: "Contexte entreprise, actualités, contacts clés générés automatiquement avant chaque RDV.",
  },
  {
    icon: Video,
    title: "Analyse automatique des calls",
    description: "Score de qualité par dimension, sentiment, points forts et axes d'amélioration.",
  },
  {
    icon: History,
    title: "Historique complet par contact",
    description: "Toutes vos interactions centralisées : briefs, appels, emails, devis.",
  },
  {
    icon: FileCheck,
    title: "Devis en un clic",
    description: "Pré-remplis à partir de vos échanges, envoyés par email avec signature en ligne.",
  },
  {
    icon: CheckSquare,
    title: "Tâches de suivi automatiques",
    description: "Brief crée vos relances et brouillons emails au bon moment.",
  },
  {
    icon: Users,
    title: "Pilotage d'équipe",
    description: "Managers : tableau de bord de performance, coaching sur les enregistrements.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="py-16 md:py-24 lg:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
          Tout ce dont un commercial B2B a besoin
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
