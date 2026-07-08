import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-indigo-600 py-16 md:py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Prêt à transformer vos rendez-vous ?</h2>
        <p className="text-indigo-200 text-lg mb-8">
          Rejoignez les commerciaux qui utilisent Brief pour gagner en efficacité et fermer plus de deals.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-white text-indigo-600 text-base font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors duration-200"
        >
          Se connecter →
        </Link>
        <p className="text-sm text-indigo-200 mt-4">Accès sur invitation</p>
      </div>
    </section>
  );
}
