import Link from "next/link";
import { DashboardMockup } from "./DashboardMockup";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Pour équipes commerciales B2B
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] mb-6">
            Le copilote IA de vos rendez-vous commerciaux
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
            Brief prépare vos rendez-vous, les analyse en temps réel, et automatise vos suivis. Concentrez-vous sur
            la vente, on s&apos;occupe du reste.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-base font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors duration-200"
          >
            Se connecter →
          </Link>
          <p className="text-sm text-gray-400 mt-3">Accès sur invitation uniquement</p>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}
