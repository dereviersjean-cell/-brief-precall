const STEPS = [
  {
    number: "01",
    title: "Avant le RDV",
    description:
      "Brief génère un brief personnalisé sur l'entreprise et le contact, sourcé sur le web et Pappers.",
  },
  {
    number: "02",
    title: "Pendant le RDV",
    description: "Le bot rejoint votre visio et enregistre tout ce qui se dit.",
  },
  {
    number: "03",
    title: "Après le RDV",
    description:
      "Analyse détaillée, tâches de suivi créées, brouillons emails prêts, devis pré-remplis à envoyer.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="py-16 md:py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16">
          Un cycle commercial complet, automatisé
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          {STEPS.map((step) => (
            <div key={step.number}>
              <p className="text-4xl font-bold text-indigo-600 mb-4">{step.number}</p>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
