import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, TrendingUp, MessagesSquare } from "lucide-react";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";

export const metadata: Metadata = {
  title: "Connexion — Brief",
  description: "Connectez-vous à Brief pour augmenter le taux de closing de votre équipe commerciale.",
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
    <div className="brief-ui min-h-screen bg-background text-ink grid lg:grid-cols-2">
      {/* Left — sign in */}
      <div className="relative flex flex-col px-6 py-8 md:px-12 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl brand-gradient text-white text-[13px] font-semibold shadow-[var(--shadow-glow)]">
              B
            </span>
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
              Espace commercial B2B
            </div>

            <h1 className="text-ink text-4xl md:text-5xl leading-[1] font-bold tracking-[-0.03em]">
              Reprenez la main sur <span className="italic-serif text-primary">votre closing</span>.
            </h1>
            <p className="mt-4 text-muted-foreground">
              Connectez-vous pour retrouver vos briefs, vos analyses de rendez-vous et la progression de votre équipe.
            </p>

            {errorMessage && (
              <div className="mt-6 rounded-xl bg-[color:var(--danger-soft)] border border-rose-200 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-10 space-y-3">
              <GoogleSignInButton />
              <MicrosoftSignInButton />
            </div>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Accès sur invitation —{" "}
              <a href="mailto:hello@oliverlist.com" className="text-ink font-semibold hover:text-primary transition-colors">
                demander un accès
              </a>
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
              Le copilote qui prépare, débriefe et fait progresser chaque rendez-vous vers la signature.
            </div>
          </div>

          <div className="relative rounded-3xl bg-white border border-border/60 shadow-[0_30px_80px_-20px_rgba(80,60,180,0.25)] p-6 max-w-sm animate-float-slow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                Analyse du call
              </div>
              <span className="inline-flex items-center rounded-full bg-lavender border border-border px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                R2 — Présentation
              </span>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-ink">Acme Corp — Marie Lambert</div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Score global</span>
                <span className="font-semibold text-ink tabular-nums">3.4/5</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-lavender overflow-hidden">
                <div className="h-full rounded-full brand-gradient" style={{ width: "68%" }} />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
                Objection détectée — réponse gagnante suggérée
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Prochaine étape suggérée : relance sous 48h
              </div>
              <div className="flex items-center gap-2 text-xs text-primary">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                +0,4 vs moyenne équipe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
