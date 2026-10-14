import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "./AuthShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";
import { EmailSignIn } from "./EmailSignIn";
import { safeInternalPath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: "Connexion — Brief",
  description: "Connectez-vous à Brief : briefs, débriefs et coaching de votre équipe commerciale.",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  AccountDisabled: "Votre compte a été désactivé.",
  AccessDenied: "Connexion refusée. Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? null : null;

  // Où renvoyer après la connexion. Le middleware pose ce paramètre quand il
  // intercepte une page demandée sans session — un lien de notification ouvert
  // déconnecté, typiquement. Assaini avant usage : il vient de l'URL, donc de
  // n'importe qui (cf. lib/safe-path.ts).
  const destination = safeInternalPath(callbackUrl, "/brief");

  return (
    <AuthShell>
          <div className="land-hero-text w-full max-w-[400px]" style={{ "--i": 0 } as React.CSSProperties}>
            <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-land-ink sm:text-[48px]">
              Content de vous revoir.
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-land-muted">
              Retrouvez vos briefs, vos calls analysés et la progression de votre équipe.
            </p>

            {errorMessage && (
              <div className="mt-6 rounded-2xl bg-land-coral-soft px-4 py-3 text-[14px] text-land-coral-ink">{errorMessage}</div>
            )}

            <div className="mt-9 space-y-3">
              <GoogleSignInButton callbackUrl={destination} />
              <MicrosoftSignInButton callbackUrl={destination} />
            </div>

            {/* Sans Google ni Microsoft : mot de passe ou code par email. */}
            <div className="my-6 flex items-center gap-3 text-[13px] text-land-faint">
              <span className="h-px flex-1 bg-land-line" />
              ou avec votre email
              <span className="h-px flex-1 bg-land-line" />
            </div>
            <EmailSignIn callbackUrl={destination} />

            {/* Créer un compte est un parcours à part (/inscription), pas un
                bouton de plus dans ce formulaire (retour de Jean, 14/10/2026). */}
            <p className="mt-8 border-t border-land-line pt-6 text-[15px] text-land-muted">
              Pas encore de compte ?{" "}
              <Link
                href={destination === "/brief" ? "/inscription" : `/inscription?callbackUrl=${encodeURIComponent(destination)}`}
                className="font-semibold text-land-ink underline-offset-4 hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
    </AuthShell>
  );
}
