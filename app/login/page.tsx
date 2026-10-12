import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist } from "next/font/google";
import { ArrowLeft, Check, FileCheck2, MessageSquareWarning, Mic } from "lucide-react";
import { BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { MicrosoftSignInButton } from "./MicrosoftSignInButton";
import { safeInternalPath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: "Connexion — Brief",
  description: "Connectez-vous à Brief : briefs, débriefs et coaching de votre équipe commerciale.",
  robots: { index: false, follow: false },
};

// Même police que la landing (même variable : next/font la charge une fois).
const sans = Geist({ subsets: ["latin"], variable: "--font-land-sans", display: "swap" });

// Bleu nuit du bas de l'illustration de connexion : l'image s'y fond.
const LOGIN_INK = "#0E2658";

// Ce qu'on retrouve en arrivant le matin. Formulé sans chiffre ni nom :
// rien n'est présenté comme une donnée réelle, donc rien à étiqueter
// « exemple » (mention retirée à la demande de Jean, 12/10/2026).
const MORNING = [
  { icon: FileCheck2, tone: "bg-emerald-400/20 text-emerald-200", label: "Les briefs du jour, prêts", detail: "Préparés la veille, aussi dans vos événements d'agenda" },
  { icon: Mic, tone: "bg-land-coral/25 text-orange-200", label: "Les calls d'hier, analysés", detail: "Notés sur la grille de votre équipe" },
  { icon: MessageSquareWarning, tone: "bg-land-sun/25 text-yellow-200", label: "Les objections à revoir", detail: "Avec la réponse de votre playbook" },
];

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
    // Même univers que le haut de page de la landing (demande de Jean,
    // 12/10/2026) : jetons `.landing`, Geist, et à droite le panneau illustré —
    // la scène des trois moments fondue dans l'encre bleue, l'accroche en
    // blanc, le bandeau de logos.
    <div className={`${sans.variable} landing grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}>
      {/* Gauche : la connexion */}
      <div className="relative flex flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex h-11 items-center gap-2" aria-label="Brief, accueil">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-accent text-[13px] font-semibold text-land-accent-ink">
              B
            </span>
            <span className="text-[16px] font-semibold tracking-tight text-land-ink">Brief</span>
          </Link>
          <Link
            href="/"
            className="group inline-flex min-h-10 items-center gap-1.5 text-[14px] text-land-muted transition-colors hover:text-land-ink"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Retour au site
          </Link>
        </div>

        {/* Téléphone et tablette : la scène en bandeau, au-dessus du formulaire. */}
        <div className="relative mt-6 aspect-[16/8] overflow-hidden rounded-[24px] lg:hidden" style={{ backgroundColor: LOGIN_INK }}>
          <Image src="/landing/login-scene.jpg" alt="" fill priority sizes="100vw" className="land-hero-art object-cover object-[50%_32%]" />
        </div>

        <div className="flex flex-1 items-center justify-center py-12 lg:py-16">
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

            <ul className="mt-8 space-y-2.5 border-t border-land-line pt-6 text-[14px] text-land-muted">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                Pas encore de compte ? Il se crée à la première connexion.
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                {BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour offerts, sans carte bancaire.
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-land-faint">
          <span>© {new Date().getFullYear()} Brief</span>
          <Link href="/mentions-legales" className="transition-colors hover:text-land-ink">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="transition-colors hover:text-land-ink">
            Confidentialité
          </Link>
        </div>
      </div>

      {/* Droite : même style que le haut de page de la landing (scène en pâte à
          modeler, aplat d'encre, grand texte blanc) mais un contenu propre à la
          connexion — ce qu'on retrouve en arrivant le matin. Demande de Jean
          du 12/10/2026 : « le même style, pas la même chose ». */}
      <div className="hidden p-3 lg:block">
        <div
          className="sticky top-3 flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[32px] text-white"
          style={{ backgroundColor: LOGIN_INK }}
        >
          <div className="relative min-h-0 flex-1">
            <Image
              src="/landing/login-scene.jpg"
              alt=""
              fill
              priority
              sizes="55vw"
              className="land-hero-art object-cover object-[50%_30%]"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{ backgroundImage: `linear-gradient(180deg, transparent, ${LOGIN_INK})` }}
            />
          </div>
          <div className="relative -mt-28 px-12 pb-12 xl:px-14">
            <p
              className="land-hero-text max-w-[16ch] text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] xl:text-[46px]"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Chaque matin, <span className="text-white/65">votre journée commerciale est</span>{" "}
              <span className="text-land-sun">déjà préparée.</span>
            </p>
            <ul className="land-hero-text mt-8 space-y-2.5" style={{ "--i": 2 } as React.CSSProperties}>
              {MORNING.map((m) => (
                <li
                  key={m.label}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md"
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.tone}`}>
                    <m.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium">{m.label}</span>
                    <span className="block text-[12.5px] text-white/65">{m.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
