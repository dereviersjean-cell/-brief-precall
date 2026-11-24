import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "./AuthShell";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";
import { EmailSignIn } from "./EmailSignIn";
import { safeInternalPath } from "@/lib/safe-path";
import { APP_URL } from "@/lib/app-url";
import { buildAdminConsentUrl, consentMailto } from "@/lib/microsoft-admin-consent";

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

  // Les codes que NextAuth pose quand un départ OAuth échoue. Le détail
  // Microsoft (AADSTS65001, AADSTS90094) n'arrive pas jusqu'ici.
  const oauthFailed = !!error && ["OAuthSignin", "OAuthCallback", "Callback", "AccessDenied", "OAuthAccountNotLinked"].includes(error);
  const azureClientId = process.env.AZURE_AD_CLIENT_ID;
  // Lien sans état signé : cette personne n'a pas de compte, donc pas
  // d'organisation à porter (voir buildAdminConsentUrl).
  const consentMail =
    oauthFailed && azureClientId
      ? consentMailto({
          link: buildAdminConsentUrl({
            clientId: azureClientId,
            redirectUri: `${APP_URL}/api/microsoft/admin-consent/callback`,
          }),
        })
      : null;

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

            {/* Échec d'un départ OAuth : la première cause connue, chez un
                client en Microsoft 365, est l'accord d'administrateur jamais
                donné (le pourquoi est en tête de
                lib/microsoft-admin-consent.ts). NextAuth ne transmet pas le
                code AADSTS jusqu'ici — d'où un texte qui PROPOSE
                l'explication sans l'affirmer, et l'instrumentation posée dans
                lib/auth.ts pour savoir ce qui arrive vraiment. */}
            {oauthFailed && consentMail && (
              <div className="mt-4 rounded-2xl border border-land-line bg-land-sunken px-4 py-4">
                <p className="text-[14px] font-semibold text-land-ink">Vous vous connectiez avec Microsoft ?</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-land-muted">
                  Si votre entreprise est sur Microsoft 365, l&apos;accès à Brief doit être autorisé une fois par votre
                  administrateur. Microsoft l&apos;exige avant qu&apos;un salarié puisse connecter son agenda : ce
                  n&apos;est pas votre compte qui est refusé.
                </p>
                <a
                  href={consentMail}
                  className="mt-3 inline-flex items-center gap-2 text-[13.5px] font-semibold text-land-accent underline-offset-4 hover:underline"
                >
                  Prévenir mon administrateur
                </a>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-land-faint">
                  Ouvre un message déjà rédigé, avec le lien d&apos;autorisation et la liste exacte des droits demandés.
                  Rien n&apos;est envoyé sans vous.
                </p>
              </div>
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
