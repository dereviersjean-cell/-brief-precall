import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";

export const metadata: Metadata = {
  title: "Connexion — Brief",
  description: "Connectez-vous à Brief, le copilote IA de vos rendez-vous commerciaux.",
  robots: { index: false, follow: false },
};

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
    <div className="marketing-page min-h-screen bg-background text-ink grid lg:grid-cols-2">
      {/* Left — sign in */}
      <div className="relative flex flex-col px-6 py-8 md:px-12 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-ink text-background grid place-items-center font-bold text-sm">
              B
            </div>
            <span className="font-semibold tracking-tight text-ink">Brief</span>
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Retour au site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-16">
          <div className="w-full max-w-sm animate-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Espace Sales
            </div>

            <h1 className="text-ink text-4xl md:text-5xl leading-[1] font-bold tracking-[-0.03em]">
              Reprenez la main sur <span className="italic-serif text-primary">votre pipe</span>.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Connectez-vous pour retrouver vos calls, vos briefs et vos indicateurs d&apos;équipe.
            </p>

            {errorMessage && (
              <div className="mt-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-10 space-y-3">
              <GoogleSignInButton />
              <MicrosoftSignInButton />
            </div>

            <p className="mt-8 text-sm text-muted-foreground text-center">
              Pas encore de compte ?{" "}
              <Link href="/login" className="text-ink font-semibold hover:text-primary transition-colors">
                Créer un compte gratuitement
              </Link>
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
          <span>© {new Date().getFullYear()} Brief</span>
          <a href="#" className="hover:text-ink transition-colors">
            Mentions légales
          </a>
          <a href="#" className="hover:text-ink transition-colors">
            Confidentialité
          </a>
        </div>
      </div>

      {/* Right — illustrative panel (no fabricated stats or testimonials) */}
      <div className="hidden lg:block relative overflow-hidden bg-lavender/50 border-l border-border/60">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute top-24 -left-20 w-[500px] h-[500px] rounded-full bg-lavender-deep/60 blur-3xl animate-blob" />
          <div className="absolute bottom-10 right-10 w-[380px] h-[380px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        </div>

        <div className="relative h-full flex flex-col justify-between p-12 xl:p-16">
          <div className="max-w-md">
            <div className="italic-serif text-4xl xl:text-5xl leading-[1.05] text-ink">
              Le copilote IA qui prépare, analyse et suit chaque rendez-vous commercial.
            </div>
          </div>

          <div className="relative rounded-3xl bg-white border border-border/60 shadow-[0_30px_80px_-20px_rgba(80,60,180,0.25)] p-6 max-w-sm animate-float-slow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Analyse du call
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-ink">Acme Corp — Marie Lambert</div>
              <div className="mt-3 h-1.5 rounded-full bg-lavender overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "68%" }} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Score global : 3.4/5</div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Prochaine étape suggérée : relance sous 48h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
