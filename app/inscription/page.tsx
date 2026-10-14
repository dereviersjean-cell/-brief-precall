import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { AuthShell } from "@/app/login/AuthShell";
import { GoogleSignInButton } from "@/app/login/GoogleSignInButton";
import { MicrosoftSignInButton } from "@/app/login/MicrosoftSignInButton";
import { BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { safeInternalPath } from "@/lib/safe-path";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Créer un compte — Brief",
  description: "Créez votre compte Brief : vos briefs de rendez-vous, prêts avant chaque call.",
  robots: { index: false, follow: false },
};

// Création de compte (14/10/2026) : parcours à part de la connexion, à la
// demande de Jean. Google et Microsoft créent le compte à la première
// connexion ; l'email passe par SignUpForm (vérification par code).
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await searchParams;
  const destination = safeInternalPath(callbackUrl, "/brief");
  const initialEmail = typeof email === "string" && email.length <= 254 ? email : "";

  return (
    <AuthShell>
      <div className="land-hero-text w-full max-w-[400px]" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-land-ink sm:text-[48px]">
          Créez votre compte.
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-land-muted">
          Vos rendez-vous préparés en deux minutes, dès aujourd&apos;hui.
        </p>

        <div className="mt-9 space-y-3">
          <GoogleSignInButton callbackUrl={destination} />
          <MicrosoftSignInButton callbackUrl={destination} />
        </div>

        <div className="my-6 flex items-center gap-3 text-[13px] text-land-faint">
          <span className="h-px flex-1 bg-land-line" />
          ou avec votre email
          <span className="h-px flex-1 bg-land-line" />
        </div>
        <SignUpForm initialEmail={initialEmail} callbackUrl={destination} />

        <ul className="mt-8 space-y-2.5 border-t border-land-line pt-6 text-[14px] text-land-muted">
          <li className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-land-accent" aria-hidden />
            {BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour offerts, sans carte bancaire.
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-land-accent" aria-hidden />
            Votre agenda se relie en un clic, quand vous voulez.
          </li>
        </ul>

        <p className="mt-6 text-[15px] text-land-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-land-ink underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
