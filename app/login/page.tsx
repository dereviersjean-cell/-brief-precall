import Link from "next/link";
import { GoogleSignInButton } from "./GoogleSignInButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900 text-lg">Brief</span>
          </Link>
        </nav>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Connexion à Brief
            </h1>
            <p className="text-slate-500 text-sm">
              Accédez à vos briefs pré-call
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <form action="/dashboard" method="get" className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="vous@entreprise.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Mot de passe
                  </label>
                  <a
                    href="#"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Se connecter
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">ou</span>
                </div>
              </div>
              <GoogleSignInButton />
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{" "}
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Créer un compte gratuitement
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
