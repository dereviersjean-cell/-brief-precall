import Link from "next/link";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";

const ERROR_MESSAGES: Record<string, string> = {
  AccountDisabled: "Votre compte a été désactivé.",
  AccessDenied: "Connexion refusée. Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

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

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <GoogleSignInButton />
            <MicrosoftSignInButton />
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
