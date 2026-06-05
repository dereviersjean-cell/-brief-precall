import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "Généré en 30 secondes",
    description:
      "Brief analyse automatiquement l'entreprise, les contacts et le contexte pour vous livrer un résumé actionnable avant chaque call.",
  },
  {
    icon: "🎯",
    title: "Points de discussion ciblés",
    description:
      "Chaque brief inclut des pain points identifiés, des arguments personnalisés et une accroche d'ouverture suggérée.",
  },
  {
    icon: "🔗",
    title: "Connecté à votre CRM",
    description:
      "Intégration native avec Salesforce et HubSpot — vos briefs se génèrent automatiquement depuis vos rendez-vous existants.",
  },
];

const testimonials = [
  {
    quote:
      "Avant Brief, je passais 2h à préparer mes appels découverte. Maintenant je prends 10 minutes pour lire le brief et je suis beaucoup plus percutant.",
    name: "Marc Delacroix",
    title: "Account Executive chez une scale-up SaaS",
  },
  {
    quote:
      "Le taux de conversion de nos calls a augmenté de 23% depuis qu'on utilise Brief. Les commerciaux arrivent vraiment préparés.",
    name: "Sarah Bertrand",
    title: "VP Sales, série B",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">Brief</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Commencer gratuitement
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            Nouveau : intégration Salesforce disponible
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-6 leading-tight max-w-3xl mx-auto">
            Préparez chaque call commercial{" "}
            <span className="text-indigo-600">en 2 minutes</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Brief génère automatiquement un résumé complet avant chaque
            rendez-vous — contexte entreprise, actualités, pain points et
            arguments adaptés. Vos commerciaux arrivent préparés, toujours.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-base"
            >
              Essayer gratuitement
            </Link>
            <Link
              href="/dashboard"
              className="text-slate-600 px-8 py-3.5 rounded-xl font-semibold border border-slate-200 hover:bg-slate-50 transition-colors text-base"
            >
              Voir la démo →
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            Aucune carte de crédit requise · Gratuit 14 jours
          </p>
        </div>

        {/* Preview */}
        <div className="max-w-5xl mx-auto px-6 pb-24">
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
              <span className="text-slate-400 text-xs ml-2 font-mono">
                brief.app/brief/1
              </span>
            </div>
            <div className="p-8 grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                    Vue d&apos;ensemble
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 bg-slate-700 rounded w-full"></div>
                    <div className="h-3 bg-slate-700 rounded w-4/5"></div>
                    <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">
                    Points de discussion
                  </div>
                  {["bg-indigo-500", "bg-emerald-500", "bg-amber-500"].map(
                    (color, i) => (
                      <div key={i} className="flex items-start gap-3 mb-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${color} mt-1.5 shrink-0`}
                        ></div>
                        <div className="space-y-1 flex-1">
                          <div className="h-2.5 bg-slate-700 rounded w-1/3"></div>
                          <div className="h-2 bg-slate-700/60 rounded w-full"></div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                    Contact
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/30"></div>
                    <div className="space-y-1">
                      <div className="h-2.5 bg-slate-700 rounded w-20"></div>
                      <div className="h-2 bg-slate-700/60 rounded w-16"></div>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-900/30 border border-emerald-700/30 rounded-xl p-4">
                  <div className="text-emerald-400 text-xs font-medium mb-2">
                    💬 Accroche suggérée
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-emerald-800/40 rounded w-full"></div>
                    <div className="h-2 bg-emerald-800/40 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-24 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Tout ce dont vos commerciaux ont besoin
          </h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
            Brief centralise l&apos;intel dont votre équipe a besoin pour
            performer — sans effort de préparation.
          </p>
          <div className="grid grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2 text-lg">
                  {f.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-16">
            Ce que disent les équipes sales
          </h2>
          <div className="grid grid-cols-2 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-100"
              >
                <p className="text-slate-700 leading-relaxed mb-4 text-sm">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {t.name}
                  </p>
                  <p className="text-slate-500 text-xs">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à transformer vos calls ?
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Rejoignez les équipes commerciales qui préparent leurs appels avec
            Brief.
          </p>
          <Link
            href="/login"
            className="bg-white text-indigo-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-indigo-50 transition-colors inline-block"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-white font-medium">Brief</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 Brief. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
