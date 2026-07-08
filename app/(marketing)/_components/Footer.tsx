import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">B</span>
              </div>
              <span className="font-semibold text-gray-900 text-lg">Brief</span>
            </Link>
            <p className="text-sm text-gray-500 max-w-xs">Le copilote IA de vos rendez-vous commerciaux.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Produit</p>
            <div className="space-y-2">
              <a
                href="#fonctionnalites"
                className="block text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200"
              >
                Fonctionnalités
              </a>
              <a
                href="#integrations"
                className="block text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200"
              >
                Intégrations
              </a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Légal</p>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                Mentions légales
              </a>
              <a href="#" className="block text-sm text-gray-500 hover:text-gray-900 transition-colors duration-200">
                Confidentialité
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-400">© 2026 Brief. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
