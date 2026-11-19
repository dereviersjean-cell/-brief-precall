// Sections du site public, partagées par l'accueil et les pages Directeurs
// commerciaux, Commerciaux, Comment ça marche, Intégrations et Sécurité.
// Chaque page n'assemble que ce dont elle a besoin ; l'habillage commun
// (barre, pied de page, police) est dans SiteChrome.tsx.
//
// Textes du 19/11/2026 : ceux du cadrage GTM d'Hubert (« Website V2,
// maquettes et intentions »), repris mot pour mot sur l'accueil et les deux
// pages par public. Ses maquettes fixent la hiérarchie, pas le dessin : le
// design, les composants et les aperçus au format réel du site sont gardés
// (consigne du cadrage : « réutiliser les vraies captures produit »). Ses
// écrans d'exemple portaient des chiffres inventés (taux de conversion,
// exécution du playbook en %) ; le cadrage interdit d'en publier, les aperçus
// restent donc ceux de l'app.
// Un seul appel à l'action partout : « Voir Brief en action », vers le
// planning de rendez-vous.
//
// Typographie française : les espaces avant « : ; ? ! » et à l'intérieur des
// guillemets sont des espaces insécables (U+00A0), invisibles dans l'éditeur.
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { SALES_CONTACT, BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { CTA_LABEL } from "@/app/components/landing/SiteChrome";
import { Journey, type JourneyStep } from "@/app/components/landing/Journey";
import { HERO_INK } from "@/app/components/landing/ClientLogos";
import { MethodPreview } from "@/app/components/landing/MethodPreview";
import { DealsBoard } from "@/app/components/landing/DealsBoard";
import { MeetingPairObject } from "@/app/components/landing/MeetingPairObject";
import { Reveal } from "@/app/components/landing/Reveal";
import { DealObject, FollowUpObject, DigestObject } from "@/app/components/landing/objects";
import { NB } from "@/app/components/landing/team-data";
import { TestimonialCarousel, CompanyMark } from "@/app/components/landing/TestimonialCarousel";
import { FEATURED, CARDS, visibleTestimonials } from "@/app/components/landing/testimonials-data";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  EyeOff,
  Globe2,
  Layers,
  Lock,
  Mail,
  Mic,
  Plus,
  Server,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  Zap,
} from "lucide-react";

// Titres de section en deux tons : l'affirmation en encre, la suite en gris.
// C'est la seule hiérarchie dont ils ont besoin — pas de surtitre.
export const H2 = "text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[52px] lg:text-[60px]";

// ─── Appel à l'action ────────────────────────────────────────────────────────
// Le seul du site (cadrage GTM) : il ouvre le planning de rendez-vous.
// `light` : sur un aplat d'encre ; `accent` : sur fond clair.

const CTA_STYLES = {
  // Encre fixe et non `text-land-ink` : en thème sombre ce jeton devient clair,
  // et le libellé disparaissait sur le bouton blanc (vu le 19/11/2026).
  light: "bg-white text-[oklch(0.19_0.02_266)] focus-visible:outline-white [--land-cta-glint:oklch(0.52_0.2_265/0.16)]",
  accent: "bg-land-accent text-white hover:brightness-110 focus-visible:outline-land-accent",
};

/** Titre de haut de page animé mot à mot (classe `land-word`, globals.css).
 * `from` décale la cascade quand le titre est en deux morceaux. Les mots
 * restent du texte ordinaire, séparés par de vraies espaces. */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((word, i) => (
    <span key={i}>
      <span className="land-word" style={{ "--w": from + i } as React.CSSProperties}>
        {word}
      </span>{" "}
    </span>
  ));
}
const count = (text: string) => text.split(" ").length;

export function Cta({ tone = "accent", className = "" }: { tone?: keyof typeof CTA_STYLES; className?: string }) {
  return (
    <a
      href={SALES_CONTACT.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`land-cta inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[16px] font-semibold transition-[transform,filter,background-color] duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${CTA_STYLES[tone]} ${className}`}
    >
      {CTA_LABEL} <ArrowRight className="land-arrow h-4 w-4" aria-hidden />
    </a>
  );
}

/** Surtitre de section (« La solution Brief », « Exécution et performance »). */
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-land-accent">{children}</p>;
}

// ─── Haut de page ────────────────────────────────────────────────────────────

// Haut de page illustré, sur le modèle de lemlist et Clay (demande de Jean du
// 12/10/2026) : une scène en 3D qui se fond en bas dans un aplat d'encre bleue
// où se posent le titre (à gauche) et l'accroche avec le bouton (à droite).
// La bande « L'équipe derrière Brief a accompagné les équipes commerciales
// de… » et ses logos ont été retirés le 19/11/2026 à la demande de Jean.
// Textes du cadrage GTM (19/11/2026) : la promesse est de transformer
// davantage d'opportunités en clients, pour un dirigeant ou un directeur
// commercial.

export function Hero() {
  return (
    <section aria-label="Présentation">
        <div className="px-2 pt-2 sm:px-3 sm:pt-3">
          <div
            className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[24px] text-white sm:rounded-[32px]"
            style={{ backgroundColor: HERO_INK }}
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/8] lg:aspect-auto lg:h-[min(38vh,380px)]">
              <Image
                src="/landing/hero-scene.jpg"
                alt=""
                fill
                priority
                sizes="(min-width: 1400px) 1400px, 100vw"
                className="land-hero-art object-cover object-[50%_35%]"
              />
              {/* L'illustration se fond dans l'aplat : pas de couture. */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-2/5"
                style={{ backgroundImage: `linear-gradient(180deg, transparent, ${HERO_INK})` }}
              />
            </div>
            <div className="relative -mt-10 grid grid-cols-1 gap-6 px-5 pb-10 sm:px-10 md:-mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:px-16 lg:pb-14">
              <div>
                <span
                  className="land-hero-text inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/85 ring-1 ring-white/15"
                  style={{ "--i": 0 } as React.CSSProperties}
                >
                  <span className="land-shine">L&apos;IA au service de votre exécution commerciale</span>
                </span>
                <h1 className="mt-5 max-w-[16ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[56px] lg:text-[64px]">
                  <Words text="Transformez davantage de vos opportunités" />
                  <span className="text-land-sun">
                    <Words text="en clients." from={5} />
                  </span>
                </h1>
              </div>
              <div className="land-hero-text lg:pb-2" style={{ "--i": 1 } as React.CSSProperties}>
                <p className="max-w-[34rem] text-[18px] leading-relaxed text-white/90 sm:text-[19px]">
                  Brief identifie ce qui freine vos deals, recommande les prochaines actions à vos commerciaux et indique à
                  vos managers où intervenir pour accélérer leur progression jusqu&apos;au closing.
                </p>
                <div className="mt-7">
                  <Cta tone="light" />
                </div>
                <p className="mt-4 inline-flex items-center gap-2 text-[14px] text-white/70">
                  <CalendarDays className="h-4 w-4" aria-hidden /> Découvrez Brief lors d&apos;une démonstration personnalisée.
                </p>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}


// ─── Accueil : les trois douleurs ────────────────────────────────────────────

const PAINS = [
  {
    icon: CalendarDays,
    title: "Des opportunités mal exploitées",
    body: "Les rendez-vous s'enchaînent, mais les informations décisives ne sont pas toujours obtenues pour faire progresser le deal.",
  },
  {
    icon: TrendingUp,
    title: "Des deals qui stagnent",
    body: "Prochaines étapes floues, engagements oubliés, relances tardives : des opportunités prometteuses finissent par s'essouffler.",
  },
  {
    icon: Users,
    title: "Des managers qui interviennent trop tard",
    body: "Sans visibilité sur les vrais blocages, les directeurs commerciaux découvrent parfois les risques lorsqu'il est déjà trop tard pour agir.",
  },
];

export function PainSection() {
  return (
    <section className="relative overflow-hidden border-t border-land-line">
      <div aria-hidden className="land-dots" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <h2 className={`${H2} max-w-[22ch] text-land-ink`}>Vos deals ne se perdent pas toujours face à la concurrence.</h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Parfois, ils se perdent simplement parce que les bonnes actions n&apos;ont pas été menées au bon moment.
        </p>
        <Reveal as="ul" spotlight className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-14">
          {PAINS.map((p, i) => (
            <li key={p.title} className="land-reveal land-spot rounded-[22px] border border-land-line bg-land-surface p-6" style={{ "--i": i } as React.CSSProperties}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-5 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ─── Aperçus produit partagés ────────────────────────────────────────────────
// « Deal Macro » et « Manager Radar » sont les noms du cadrage GTM pour deux
// écrans de l'app : la page d'un deal et « Suivi des deals ». L'étiquette
// porte le nom du cadrage ; l'aperçu, lui, reste l'écran réel.

function ScreenTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-land-surface px-3 py-1.5 text-[13px] font-semibold text-land-ink shadow-[var(--land-shadow)] ring-1 ring-land-line">
      <span className="h-2 w-2 rounded-full bg-land-accent" aria-hidden />
      {children}
    </span>
  );
}

/** « Suivi des deals », interactif, sur sa nappe de couleur, avec sa
 * démonstration automatique (curseur qui clique tant qu'on n'a pas pris la
 * main). Le cadrage demande une place forte pour cet écran. */
function ManagerRadar() {
  return (
    <div>
      <ScreenTag>Manager Radar</ScreenTag>
      <div className="relative mt-8">
        <div aria-hidden className="land-aurora absolute -inset-x-2 -bottom-6 top-24 rounded-[36px] sm:-inset-x-6 lg:-inset-x-10">
          <i />
          <i />
          <i />
        </div>
        <div className="relative">
          <DealsBoard demo />
        </div>
      </div>
    </div>
  );
}

function AudiencePill({ icon: Icon, children }: { icon: typeof Users; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-land-accent-soft py-1.5 pl-2 pr-3.5 text-[13.5px] font-semibold text-land-accent">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-land-surface">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {children}
    </span>
  );
}

const MORE = "mt-7 inline-flex items-center gap-1.5 text-[15px] font-medium text-land-ink hover:text-land-accent";

// ─── Accueil : la solution, pour les deux publics ────────────────────────────

const REP_POINTS = [
  {
    icon: Target,
    title: "Savoir quoi faire pour faire avancer le deal",
    body: "Brief repère les informations manquantes, les objections et les prochaines étapes à sécuriser.",
  },
  {
    icon: CalendarDays,
    title: "Mieux exécuter chaque rendez-vous",
    body: "Préparation contextualisée, analyse du playbook et suggestions concrètes.",
  },
  {
    icon: Zap,
    title: "Automatiser le suivi commercial",
    body: "CRM enrichi, emails de suivi préparés et engagements visibles.",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <Eyebrow>La solution Brief</Eyebrow>
        <h2 className={`${H2} max-w-[20ch]`}>
          <span className="text-land-ink">Des commerciaux mieux guidés.</span>{" "}
          <span className="text-land-faint">Des managers qui savent où agir.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Brief s&apos;appuie sur votre méthode commerciale et l&apos;historique de vos échanges pour aider vos équipes à
          faire progresser davantage d&apos;opportunités.
        </p>

        {/* Pour les commerciaux : le texte, puis la page d'un deal. */}
        <div className="mt-16 grid grid-cols-1 items-center gap-10 lg:mt-20 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <AudiencePill icon={UserRound}>Pour les commerciaux</AudiencePill>
            <h3 className="mt-5 max-w-[20ch] text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] text-land-ink md:text-[36px]">
              Faites avancer chaque opportunité, rendez-vous après rendez-vous.
            </h3>
            <Reveal as="ul" className="mt-8 space-y-6">
              {REP_POINTS.map((p, i) => (
                <li key={p.title} className="land-reveal flex gap-4" style={{ "--i": i } as React.CSSProperties}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                    <p.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <div className="text-[17px] font-semibold tracking-tight text-land-ink">{p.title}</div>
                    <p className="mt-1 text-[15px] leading-relaxed text-land-muted">{p.body}</p>
                  </div>
                </li>
              ))}
            </Reveal>
            <Link href="/commerciaux" className={MORE}>
              Brief pour les commerciaux <ArrowRight className="land-arrow h-4 w-4" aria-hidden />
            </Link>
          </div>
          {/* La fiche se « lit » quand elle arrive à l'écran : la priorité
              d'abord, puis les engagements et l'état du deal, ligne à ligne. */}
          <Reveal>
            <ScreenTag>Deal Macro</ScreenTag>
            <div className="land-reveal mt-5 rounded-[28px] bg-land-accent-soft p-2.5 sm:p-4">
              <DealObject />
            </div>
          </Reveal>
        </div>

        {/* Pour les directeurs commerciaux et dirigeants : « Suivi des
            deals » en grand. */}
        <div className="mt-24 lg:mt-32">
          <AudiencePill icon={Users}>Pour les directeurs commerciaux et dirigeants</AudiencePill>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-2">
            <h3 className="max-w-[24ch] text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] text-land-ink md:text-[36px]">
              Identifiez les deals sur lesquels votre intervention peut faire la différence.
            </h3>
            <Link href="/directeurs-commerciaux" className={`${MORE} mt-0 lg:mb-1.5`}>
              Brief pour les directeurs commerciaux <ArrowRight className="land-arrow h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-10">
            <ManagerRadar />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Accueil : la réassurance ────────────────────────────────────────────────
// CRM existant, méthode propre au client, faible charge administrative.
// La maquette du cadrage affichait quatre CRM ; Brief ne se connecte qu'à
// HubSpot et Pipedrive, seuls affichés (décision de Jean, 19/11/2026).

const REASSURANCE = [
  {
    icon: Layers,
    title: "Votre CRM reste votre référence",
    body: "Brief exploite vos opportunités et facilite leur enrichissement sans imposer un nouveau pipeline.",
  },
  {
    icon: BookOpen,
    title: "Votre méthode commerciale",
    body: "Brief s'appuie sur les étapes et critères de vente de votre entreprise pour contextualiser ses analyses.",
  },
  {
    icon: Zap,
    title: "Moins de travail administratif",
    body: "Comptes rendus, emails de suivi et informations clés sont automatiquement organisés pour vous concentrer sur la vente.",
  },
];

const CRM_LOGOS = ["hubspot", "pipedrive"];

export function ReassuranceSection() {
  return (
    <section className="relative overflow-hidden border-t border-land-line">
      <div aria-hidden className="land-dots" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <h2 className={`${H2} max-w-[20ch]`}>
          <span className="text-land-ink">Votre méthode de vente. Votre CRM.</span>{" "}
          <span className="text-land-faint">Brief s&apos;occupe du reste.</span>
        </h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Un copilote qui s&apos;intègre à votre environnement et s&apos;adapte à votre façon de vendre, sans complexité.
        </p>
        <Reveal as="ul" className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mt-14">
          {REASSURANCE.map((p, i) => (
            <li key={p.title} className="land-reveal" style={{ "--i": i } as React.CSSProperties}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-4 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body}</p>
            </li>
          ))}
        </Reveal>
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5 border-t border-land-line pt-8">
          <span className="text-[14px] font-semibold text-land-ink">Compatible avec vos outils</span>
          <ul className="flex items-center gap-2.5">
            {CRM_LOGOS.map((file) => (
              <li
                key={file}
                className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-land-line bg-land-surface px-3.5 text-[14.5px] font-medium text-land-ink"
              >
                <StackLogo file={file} size={22} /> {STACK_LOGOS[file]}
              </li>
            ))}
          </ul>
          <span className="inline-flex max-w-[40ch] items-start gap-2.5 text-[14.5px] leading-snug text-land-muted lg:ml-auto">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-land-accent-soft text-land-accent">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            Conçu pour les équipes commerciales B2B, sans nécessiter une équipe RevOps dédiée.
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Directeurs commerciaux et dirigeants ────────────────────────────────────
// Ordre du cadrage GTM : d'abord les opportunités à risque (Manager Radar),
// puis l'exécution du playbook, puis la conversion — sans donner au coaching
// plus de place qu'au suivi des deals.

const MANAGER_POINTS = [
  {
    icon: Target,
    title: "Repérez rapidement les deals à risque",
    body: "Identifiez les opportunités qui se bloquent et les raisons précises de leur ralentissement.",
  },
  {
    icon: Zap,
    title: "Intervenez au bon moment",
    body: "Recevez des recommandations concrètes et contextualisées pour aider vos commerciaux à relancer la progression.",
  },
  {
    icon: TrendingUp,
    title: "Pilotez l'exécution et la performance",
    body: "Suivez l'application de votre playbook et mesurez l'impact sur la conversion de votre équipe.",
  },
];

export function ManagerRadarSection() {
  return (
    <section id="manager-radar" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 lg:pb-28 lg:pt-20">
        <ManagerRadar />
        <Reveal as="ul" className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mt-20">
          {MANAGER_POINTS.map((p, i) => (
            <li key={p.title} className="land-reveal" style={{ "--i": i } as React.CSSProperties}>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-4 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const EXECUTION_CHECKS = [
  "Exécution du playbook par étape",
  "Progression des deals et taux de conversion",
  "Performance de chaque commercial",
  "Tendances et points d'attention de l'équipe",
];

// « Exécution et performance ». La maquette du cadrage montrait un taux
// d'exécution du playbook et une note par commercial, que l'app n'a pas : à
// leur place, les écrans réels qui portent ce pilotage — la page Méthode (ce
// qu'il faut obtenir à chaque étape, les objections et leur traitement) et le
// bilan de la semaine (ce qui a marché, les points d'attention).
export function ExecutionSection() {
  return (
    <section id="execution" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <Eyebrow>Exécution et performance</Eyebrow>
        <h2 className={`${H2} max-w-[18ch] text-land-ink`}>Un pilotage complet de votre exécution commerciale.</h2>
        <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Au-delà des deals à risque, Brief vous donne une vision claire de l&apos;exécution de votre playbook et de la
          performance de votre équipe pour identifier les leviers d&apos;amélioration.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <MethodPreview />
          {/* Le lecteur visé, en image : le directeur commercial. Photo
              générée par IA (Higgsfield, 12/10/2026), sans mention à l'écran
              (choix de Jean, 12/10/2026). */}
          <figure className="lg:sticky lg:top-24">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-land-sunken">
              <Image
                src="/landing/people/directrice.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-cover"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-2xl bg-land-surface/90 px-3.5 py-3 shadow-[var(--land-shadow)] backdrop-blur-md backdrop-saturate-150 sm:bottom-4 sm:left-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-land-accent text-white">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold text-land-ink">Bilan de la semaine</div>
                  <div className="text-[12.5px] text-land-muted">
                    Vendredi <span className="tabular-nums">18:00</span>, par email
                  </div>
                </div>
              </div>
            </div>
            <Reveal as="ul" className="mt-6 space-y-3 text-[15px] text-land-ink">
              {EXECUTION_CHECKS.map((t, i) => (
                <li key={t} className="land-reveal flex gap-3" style={{ "--i": i } as React.CSSProperties}>
                  <Check className="mt-1 h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </Reveal>
          </figure>
        </div>

        {/* Le bilan part chaque vendredi par email, avec les rubriques réelles
            du bilan manager. */}
        <div className="mt-16 lg:mt-24">
          <DigestObject />
        </div>
      </div>
    </section>
  );
}

// ─── Commerciaux ─────────────────────────────────────────────────────────────
// Ordre du cadrage GTM : faire avancer le deal d'abord (la page d'un deal),
// mieux exécuter les rendez-vous ensuite (avant : le brief ; après :
// l'analyse), et l'administratif en dernier seulement — ce sont des
// accélérateurs, pas la promesse principale. Ton : un copilote qui renforce
// l'expertise du commercial, des recommandations justifiées, jamais une IA
// « qui sait mieux vendre ».

export const REP_PROMISES = [
  { icon: Zap, text: "Des actions concrètes pour faire avancer vos deals" },
  { icon: Target, text: "Des rendez-vous mieux exécutés" },
  { icon: Layers, text: "Moins d'administratif, plus de vente" },
];

export function RepPromises() {
  return (
    <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
      {REP_PROMISES.map((p) => (
        <li key={p.text} className="inline-flex max-w-[22ch] items-start gap-2.5 text-[14px] leading-snug text-white/85">
          <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-land-sun" aria-hidden />
          {p.text}
        </li>
      ))}
    </ul>
  );
}

const AUDIENCE = [
  { icon: Users, text: "Équipes de 3 à 15+ commerciaux" },
  { icon: Building2, text: "PME et ETI" },
  { icon: BarChart3, text: "Cycles de vente complexes" },
  { icon: Layers, text: "Vente en valeur" },
];

export function AudienceStrip() {
  return (
    <section aria-label="Pour qui" className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-16">
      <p className="text-center text-[15px] text-land-muted">
        Conçu pour les <span className="font-semibold text-land-ink">équipes commerciales B2B</span>
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-land-line pb-10 md:grid-cols-4 lg:pb-12">
        {AUDIENCE.map((a) => (
          <li key={a.text} className="flex items-center justify-center gap-2.5 text-center text-[15px] text-land-ink">
            <a.icon className="h-5 w-5 shrink-0 text-land-muted" aria-hidden />
            {a.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

const REP_STEPS: JourneyStep[] = [
  {
    verb: "Deals",
    moment: "Progression des deals",
    lead: "Identifiez les blocages",
    title: "et les prochaines actions.",
    body: "Pour chaque opportunité, Brief analyse les échanges et les informations du CRM, détecte ce qui pourrait freiner la progression du deal et vous suggère les actions les plus pertinentes.",
    points: [
      { title: "Informations manquantes (décideur, budget, calendrier…)" },
      { title: "Objections non résolues" },
      { title: "Prochaines étapes à sécuriser" },
    ],
    object: <DealObject />,
  },
  {
    verb: "Rendez-vous",
    moment: "Rendez-vous commerciaux",
    lead: "Préparez et exécutez",
    title: "des rendez-vous plus efficaces.",
    body: "Brief vous aide à arriver mieux préparé, à approfondir les bons sujets pendant l'échange et à améliorer votre exécution commerciale grâce à une analyse post-meeting contextualisée.",
    points: [
      { title: "Préparation du rendez-vous : enjeux, questions clés, preuves" },
      { title: "Analyse de l'échange au regard de votre playbook" },
      { title: "Suggestions concrètes pour la suite" },
    ],
    object: <MeetingPairObject />,
  },
  {
    verb: "Suivi",
    moment: "Suivi et exécution",
    lead: "Automatisez le suivi",
    title: "et gardez le cap.",
    body: "Brief transforme vos échanges en actions de suivi concrètes, sans charge administrative, pour garder vos opportunités en mouvement.",
    points: [
      { title: "Compte rendu automatique du rendez-vous" },
      { title: "Email de suivi prêt à envoyer, personnalisé" },
      { title: "Engagements des deux parties suivis et centralisés" },
      { title: "Synchronisation des informations clés dans le CRM" },
    ],
    object: <FollowUpObject />,
  },
];

export function RepJourney() {
  return (
    <section id="benefices" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:pb-24 lg:pt-10">
        <Journey steps={REP_STEPS} label="Les trois bénéfices pour les commerciaux" />
      </div>
    </section>
  );
}

// ─── Témoignages ─────────────────────────────────────────────────────────────

// Un carrousel de grands témoignages (portrait + citation) puis six cartes,
// sur le modèle de lemlist et PayFit. Tous réels (cf. testimonials-data.ts) ;
// un témoignage de maquette porterait `fictional` et serait retiré du build
// de production. Tant qu'il en reste à l'écran, un bandeau le dit.
export function Testimonials() {
  const featured = visibleTestimonials(FEATURED);
  const cards = visibleTestimonials(CARDS);
  const mock = [...featured, ...cards].some((t) => t.fictional);
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        {mock && (
          <p className="mb-8 inline-flex items-center gap-2 rounded-full bg-land-sun-soft px-3 py-1.5 text-[12.5px] font-medium text-land-sun-ink">
            Maquette interne{NB}: certains témoignages sont fictifs et n&apos;apparaissent pas en production.
          </p>
        )}
        {featured.length + cards.length > 1 && (
          <h2 className={`${H2} mb-14 max-w-[18ch] lg:mb-20`}>
            <span className="text-land-ink">Ils structurent leur équipe avec Brief.</span>{" "}
            <span className="text-land-faint">Ce qui a changé pour eux.</span>
          </h2>
        )}
        <TestimonialCarousel items={featured} />
        {cards.length > 0 && (
          <ul className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-20">
            {cards.map((t) => (
              <li key={t.name} className="land-lift flex flex-col rounded-[24px] border border-land-line bg-land-surface p-6">
                {/* Entreprise en tête de carte, à la place d'un logo client. */}
                <div className="flex items-center gap-2 text-[13.5px] font-semibold text-land-ink">
                  <CompanyMark color={t.color} size={24} />
                  {t.company[0].toUpperCase() + t.company.slice(1)}
                </div>
                <blockquote className="mt-5 flex-1 text-[16.5px] leading-relaxed text-land-ink">
                  «{"\u00a0"}{t.quote[0]} <span className="text-land-muted">{t.quote[1]}{"\u00a0"}»</span>
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-land-sunken">
                    <Image src={t.photo} alt="" fill sizes="44px" className="object-cover object-top" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-land-ink">{t.name}</span>
                    <span className="block text-[13px] text-land-muted">{t.role}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-8 text-[13px] text-land-faint">Portraits d&apos;illustration, avec l&apos;accord de chaque personne citée.</p>
      </div>
    </section>
  );
}

// Logos en couleur, servis depuis public/landing/stack : svgl.app pour la
// plupart, Simple Icons pour HubSpot (teinté à sa couleur de marque), et une
// icône d'app redessinée pour Pipedrive, absente des deux bibliothèques.
const STACK_LOGOS: Record<string, string> = {
  "google-calendar": "Google Agenda",
  "microsoft-outlook": "Outlook",
  "google-meet": "Google Meet",
  "microsoft-teams": "Microsoft Teams",
  zoom: "Zoom",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  gmail: "Gmail",
  slack: "Slack",
};

// Ce que Brief fait de chaque outil — vérifié dans le code le 18/11/2026 :
// lecture d'agenda et dépôt du brief dans l'événement Google
// (lib/google-calendar.ts), bot « Brief Notetaker » et son message d'annonce
// (lib/recall.ts), réunions internes écartées (lib/meeting-kind.ts), brief et
// analyse vers HubSpot, Pipedrive, Slack et email
// (lib/notifications-dispatcher.ts), propriétés HubSpot mises à jour après
// chaque call (lib/hubspot-autofill-run.ts), étape gagnée ou perdue
// (lib/crm/hubspot-deals.ts), envoi seul sur Gmail et Outlook (scopes
// gmail.send et Mail.Send), alertes sur un deal (lib/reception.ts).
// L'import du playbook depuis Notion, Word ou PDF n'a plus d'écran depuis le
// 05/11/2026 : la carte et les deux logos sont retirés.
const STACK_CARDS: { title: string; logos: string[]; points: string[] }[] = [
  { title: "Agenda", logos: ["google-calendar", "microsoft-outlook"], points: [`Brief lit vos rendez-vous à venir et repère ceux avec des prospects.`, `Sur Google Agenda, le brief est déposé dans l'événement.`] },
  { title: "Visio", logos: ["google-meet", "microsoft-teams", "zoom"], points: [`Le bot « Brief Notetaker » rejoint la visio, enregistre et transcrit.`, `Il annonce l'enregistrement dans le chat, et ne rejoint pas vos réunions internes.`] },
  { title: "CRM", logos: ["hubspot", "pipedrive"], points: [`Le brief et le compte rendu du call arrivent dans la fiche.`, `L'historique, l'étape et le montant du deal nourrissent le brief suivant.`] },
  { title: "Deals HubSpot", logos: ["hubspot"], points: [`Après chaque call, les propriétés que vous avez choisies se mettent à jour.`, `Gagné ou perdu dans Brief : l'étape change dans HubSpot.`] },
  { title: "Email", logos: ["gmail", "microsoft-outlook"], points: [`L'email de suivi part de votre adresse, après relecture.`, `Brief n'a aucun accès en lecture à votre messagerie.`] },
  { title: "Slack", logos: ["slack"], points: [`Brief et analyse du call en message privé.`, `Une alerte au manager quand un call met un deal à risque.`] },
];

function StackLogo({ file, size = 24 }: { file: string; size?: number }) {
  return (
    <Image
      src={`/landing/stack/${file}.svg`}
      alt={STACK_LOGOS[file] ?? ""}
      width={size}
      height={size}
      unoptimized
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

// Schéma en orbite : Brief au centre, les outils sur deux anneaux qui
// tournent lentement (les logos restent droits). Décoratif ; immobile en
// mouvement réduit.
function StackOrbit() {
  const inner = ["google-calendar", "microsoft-outlook", "gmail", "slack"];
  const outer = ["google-meet", "microsoft-teams", "zoom", "hubspot", "pipedrive"];
  const ring = (files: string[], r: number, reverse = false) => (
    <div className={`land-orbit absolute inset-0 ${reverse ? "land-orbit-reverse" : ""}`} aria-hidden>
      {files.map((f, i) => {
        const angle = (360 / files.length) * i;
        return (
          <div
            key={f}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${angle}deg) translate(${r}px) rotate(${-angle}deg)` }}
          >
            <div className="land-orbit-counter -ml-7 -mt-7 grid h-14 w-14 place-items-center rounded-2xl border border-land-line bg-land-surface shadow-[var(--land-shadow)]">
              <StackLogo file={f} size={28} />
            </div>
          </div>
        );
      })}
    </div>
  );
  // Boîte de 440 px aux rayons fixes, réduite d'un quart sur téléphone.
  return (
    <div className="relative mx-auto h-[330px] w-full max-w-[440px] sm:h-[440px]">
      <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 scale-[0.74] sm:scale-100">
        <span className="absolute inset-[85px] rounded-full border border-dashed border-land-line" aria-hidden />
        <span className="absolute inset-[15px] rounded-full border border-dashed border-land-line" aria-hidden />
        {ring(inner, 135)}
        {ring(outer, 205, true)}
        <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28px] bg-land-accent text-[34px] font-semibold text-white shadow-[0_20px_50px_-12px_oklch(0.52_0.2_265/0.55)]">
          B
        </div>
      </div>
    </div>
  );
}

export function Integrations({ showTitle = true }: { showTitle?: boolean }) {
  return (
    // `overflow-x-clip` : en tournant, les anneaux de l'orbite (des carrés
    // invisibles) dépassent de l'écran sur téléphone à certains angles et
    // faisaient défiler la page de côté par intermittence. `clip` et non
    // `hidden` : pas de conteneur de défilement créé.
    <section id="integrations" className="scroll-mt-20 overflow-x-clip border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        {showTitle && (
          <h2 className={`${H2} max-w-[16ch]`}>
            <span className="text-land-ink">Se branche sur votre stack.</span>{" "}
            <span className="text-land-faint">Rien de plus à ouvrir le matin.</span>
          </h2>
        )}

        <div className={`${showTitle ? "mt-14 lg:mt-16" : ""} grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16`}>
          <div className="order-2 lg:order-1">
            <p className="max-w-[46ch] text-[18px] leading-relaxed text-land-muted">
              Brief se branche en quelques clics sur les outils de l&apos;équipe, avec le compte Google ou Microsoft de chacun.
              Il y prend ce dont il a besoin, et y dépose ce qu&apos;il produit : personne n&apos;a d&apos;outil de plus à ouvrir.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-land-bg p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.07em] text-land-accent">Ce que Brief lit</div>
                <ul className="mt-3 space-y-2 text-[14.5px] text-land-ink">
                  {["Vos rendez-vous à venir", "Les visios, enregistrées et transcrites", "L'historique de votre CRM", "L'étape et le montant de vos deals"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-land-bg p-5">
                <div className="text-[12px] font-semibold uppercase tracking-[0.07em] text-land-coral-ink">Ce que Brief dépose</div>
                <ul className="mt-3 space-y-2 text-[14.5px] text-land-ink">
                  {["Le brief, la veille au soir", "Le compte rendu du call", "Les propriétés du deal, à jour", "L'email de suivi, prêt à partir"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-land-coral" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <StackOrbit />
          </div>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {STACK_CARDS.map((c) => (
            <li key={c.title} className="rounded-[20px] border border-land-line bg-land-bg p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[16px] font-semibold text-land-ink">{c.title}</span>
                <span className="flex items-center gap-1.5">
                  {c.logos.map((f) => (
                    <span key={f} className="grid h-9 w-9 place-items-center rounded-xl border border-land-line bg-land-surface" title={STACK_LOGOS[f]}>
                      <StackLogo file={f} size={20} />
                    </span>
                  ))}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-land-muted">
                {c.points.map((pt) => (
                  <li key={pt} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-land-accent" aria-hidden />
                    {pt}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-land-muted">
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-land-accent" aria-hidden /> Conforme au RGPD
          </li>
          <li className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-land-accent" aria-hidden /> Données hébergées en Europe (Paris, Francfort)
          </li>
          <li className="inline-flex items-center gap-2">
            <Mic className="h-4 w-4 text-land-accent" aria-hidden /> Participants informés de l&apos;enregistrement
          </li>
        </ul>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
// Depuis le 19/11/2026 elle n'est plus sur l'accueil (la maquette du cadrage
// GTM n'en a pas) : elle ferme la page « Comment ça marche ».
// Développée le 12/10/2026, reprise le 18/11/2026 (14 questions en trois
// thèmes) après la fin de la note sur 5 et l'arrivée des deals. Chaque réponse
// est vérifiable dans le code : bot « Brief Notetaker » et son message
// d'annonce (lib/recall.ts), réunions internes écartées (lib/meeting-kind.ts),
// mémoire d'un deal (lib/deal-progress.ts, lib/deal-macro.ts), méthode et
// objectifs par étape (lib/deal-rules.ts), coaching sans note
// (lib/deal-advice-ai.ts), canaux de diffusion (lib/notifications-dispatcher.ts,
// lib/reception.ts), écritures HubSpot (lib/hubspot-autofill-run.ts,
// lib/crm/hubspot-deals.ts), scope Gmail limité à l'envoi (lib/auth.ts),
// régions Paris / Francfort.
const FAQ_GROUPS = [
    {
      title: "Le produit",
      items: [
        { q: `Comment Brief aide-t-il à transformer davantage d'opportunités en clients ?`, a: `En identifiant ce qui freine chaque deal, en recommandant les prochaines actions aux commerciaux et en indiquant aux managers où intervenir.` },
        { q: `Comment Brief rejoint mes rendez-vous ?`, a: `Vous connectez votre agenda Google ou Outlook. Brief détecte les visios (Meet, Teams, Zoom) et y envoie son bot, « Brief Notetaker », qui enregistre et transcrit. Les réunions internes (point hebdomadaire, entretien, déjeuner…) sont reconnues à leur titre et ne sont pas enregistrées ; vous pouvez forcer l'analyse de l'une d'elles.` },
        { q: `Comment Brief suit-il un deal d'un rendez-vous à l'autre ?`, a: `Chaque rendez-vous enregistré crée ou complète le deal de son prospect. Brief retient ce que le deal sait déjà (douleur, budget, décideur, échéance…), les engagements pris de chaque côté et le prochain rendez-vous. La page du deal affiche son état, une priorité et ce qu'il reste à obtenir ; le brief du rendez-vous suivant repart de là.` },
        { q: `Comment Brief apprend-il notre méthode de vente ?`, a: `Le manager choisit la méthode de qualification (MEDDIC, BANT, MEDDPICC ou le socle Brief) et ce qu'il faut obtenir à chaque étape commerciale, sur les étapes de votre pipeline HubSpot quand il est connecté. Il fixe aussi les objections de référence et la façon d'y répondre. Tout se règle sur une seule page, Méthode, modifiable à tout moment.` },
        { q: `Brief note-t-il mes commerciaux ?`, a: `Non. Brief ne met de note ni sur un call ni sur un commercial. Après chaque rendez-vous, le commercial lit ce qu'il a bien exécuté et, au plus, deux points à travailler, chacun avec la phrase à dire la prochaine fois. Le manager, lui, voit les deals de ses commerciaux qui demandent son intervention, et la question à leur poser.` },
        { q: `Où mes commerciaux reçoivent-ils leurs briefs ?`, a: `Dans Brief, et là où ils travaillent déjà, selon les canaux activés : par email la veille, dans la description de l'événement Google Agenda, dans les notes HubSpot ou Pipedrive, ou en message Slack. Le manager peut régler ces canaux pour toute l'équipe en une fois.` },
        { q: `Que fait Brief dans mon CRM ?`, a: `Il y lit l'historique, l'étape et le montant de chaque deal, et y dépose le brief et le compte rendu de chaque call. Sur HubSpot, il met aussi à jour après chaque call les propriétés que vous avez choisies, et passe le deal à l'étape gagnée ou perdue quand vous le clôturez dans Brief.` },
      ],
    },
    {
      title: "Données et sécurité",
      items: [
        { q: `Que deviennent les enregistrements ?`, a: `Hébergement européen, chiffrement au repos et en transit, suppression sur demande. Les liens vers les vidéos sont temporaires et ne sont jamais stockés.` },
        { q: `Les participants sont-ils prévenus ?`, a: `Oui. En arrivant, le bot écrit dans le chat de la visio qu'il enregistre et transcrit la réunion, et invite chacun à le dire s'il préfère qu'il quitte la réunion.` },
        { q: `Brief lit-il mes emails ?`, a: `Non. Brief demande seulement le droit d'envoyer un email en votre nom (un suivi, une relance), jamais celui de lire votre messagerie.` },
        { q: `Où sont hébergées les données ?`, a: `En Europe : la base et l'application à Paris, les enregistrements à Francfort. Conforme au RGPD.` },
      ],
    },
    {
      title: "Essai et mise en place",
      items: [
        { q: `Puis-je tester Brief ?`, a: `Oui. Créez votre compte avec Google ou Microsoft et préparez jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour, sans carte bancaire. L'analyse des calls et le suivi des deals se mettent en place avec nous : prenez rendez-vous, on configure Brief pour votre équipe.` },
        { q: `Combien de temps pour démarrer ?`, a: `Deux minutes pour connecter l'agenda ; le premier brief arrive la veille du prochain rendez-vous. Pour l'analyse des calls et le suivi des deals, on accompagne la mise en place sur huit semaines, avec un point chaque semaine.` },
        { q: `Comment est facturé Brief ?`, a: `Les briefs sont offerts jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} par jour et par utilisateur. Pour l'équipe, l'abonnement se fait par commercial : on vous fait une proposition après un premier échange.` },
      ],
    },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] lg:gap-20 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-land-ink md:text-[48px]">
            Questions fréquentes
          </h2>
          <p className="mt-5 max-w-[36ch] text-[17px] leading-relaxed text-land-muted">
            Le produit, vos données, la mise en place. Une question qui n&apos;est pas là ?
          </p>
          {/* Contact : le rendez-vous et l'adresse de la landing. */}
          <div className="mt-8 rounded-[20px] border border-land-line bg-land-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-land-accent-soft text-land-accent">
                <CalendarClock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-land-ink">Parlons de votre équipe</div>
                <div className="text-[13px] text-land-muted">20 minutes, en visio, sans engagement.</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={SALES_CONTACT.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-land-accent px-4 text-[14px] font-medium text-white transition-[filter] hover:brightness-110"
              >
                {CTA_LABEL} <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href="mailto:contact@brief-ai.fr"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-land-line px-4 text-[14px] font-medium text-land-ink transition-colors hover:bg-land-sunken"
              >
                <Mail className="h-4 w-4" aria-hidden /> contact@brief-ai.fr
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {FAQ_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-land-accent">{g.title}</h3>
              <div className="mt-3 divide-y divide-land-line border-y border-land-line">
                {g.items.map((qa) => (
                  <details key={qa.q} className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium text-land-ink transition-colors hover:text-land-accent [&::-webkit-details-marker]:hidden">
                      {qa.q}
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-land-sunken text-land-muted transition-[transform,background-color,color] duration-300 group-open:rotate-45 group-open:bg-land-accent group-open:text-white">
                        <Plus className="h-4 w-4" aria-hidden />
                      </span>
                    </summary>
                    <p className="max-w-[62ch] pb-6 text-[15.5px] leading-relaxed text-land-muted">{qa.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Dernier appel ───────────────────────────────────────────────────────────
// Même style que le haut de page (aplat d'encre, illustration en pâte à
// modeler, texte blanc). Texte du cadrage GTM ; `body` change sur la page
// Commerciaux, où l'on s'adresse au commercial et non à son dirigeant.
// Bleu du fond de l'illustration du dernier appel : le texte s'y pose.
const CTA_INK = "#213F94";

const CTA_BODY = "Découvrez comment Brief peut aider vos équipes à transformer davantage d'opportunités en clients.";

export function FinalCTA({ body = CTA_BODY }: { body?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:pb-28">
      <div
        className="relative grid grid-cols-1 overflow-hidden rounded-[32px] text-white lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
        style={{ backgroundColor: CTA_INK }}
      >
        <div className="relative order-2 px-6 pb-12 pt-6 sm:px-12 lg:order-1 lg:py-20">
          <h2 className="max-w-[16ch] text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] md:text-[56px]">
            Faites avancer plus de deals. <span className="text-land-sun">Closez davantage.</span>
          </h2>
          <p className="mt-6 max-w-[44ch] text-[18px] leading-relaxed text-white/85">{body}</p>
          <div className="mt-9">
            <Cta tone="light" />
          </div>
        </div>
        <div className="relative order-1 aspect-[16/10] lg:order-2 lg:-ml-0.5 lg:aspect-auto">
          <Image src="/landing/cta-scene.jpg" alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-y-0 -left-1 right-0 hidden lg:block"
            style={{ backgroundImage: `linear-gradient(90deg, ${CTA_INK} 0%, ${CTA_INK}d9 18%, ${CTA_INK}66 38%, transparent 62%)` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 lg:hidden"
            style={{ backgroundImage: `linear-gradient(180deg, transparent 55%, ${CTA_INK})` }}
          />
        </div>
      </div>
    </section>
  );
}

// ─── En-tête des pages intérieures ───────────────────────────────────────────
// Même grammaire que le haut de page de l'accueil (aplat d'encre, texte blanc,
// accent jaune), en plus compact et sans illustration.
export function PageHero({
  label,
  title,
  accent,
  lead,
  art,
  ink = HERO_INK,
  cta = false,
  children,
}: {
  label: string;
  title: string;
  accent?: string;
  lead: string;
  /** Illustration en pâte à modeler, propre à la page (public/landing/art-*). */
  art?: string;
  /** Couleur de l'aplat : celle du fond de l'illustration, pour un fondu sans couture. */
  ink?: string;
  /** Affiche l'appel à l'action du site sous l'accroche. */
  cta?: boolean;
  /** Complément sous le bouton (les trois promesses de la page Commerciaux). */
  children?: ReactNode;
}) {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div
        className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[24px] text-white sm:rounded-[32px]"
        style={{ backgroundColor: ink }}
      >
        {art && (
          <div className="absolute inset-y-0 right-0 hidden w-[56%] lg:block" aria-hidden>
            <Image src={art} alt="" fill priority sizes="56vw" className="land-hero-art object-cover object-[70%_50%]" />
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg, ${ink} 0%, ${ink}cc 14%, transparent 45%)` }} />
          </div>
        )}
        {/* Même gouttière que le contenu des sections : le texte s'aligne. */}
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 md:pb-20 md:pt-20 lg:min-h-[440px]">
          <span className="land-hero-text inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-medium text-white/85 ring-1 ring-white/15">
            <span className="land-shine">{label}</span>
          </span>
          <h1
            className={`mt-5 text-[40px] font-semibold leading-[1.03] tracking-[-0.04em] sm:text-[56px] lg:text-[64px] ${art ? "max-w-[15ch]" : "max-w-[18ch]"}`}
          >
            <Words text={title} />
            {accent && (
              <span className="text-land-sun">
                <Words text={accent} from={count(title)} />
              </span>
            )}
          </h1>
          <p
            className={`land-hero-text mt-6 text-[18px] leading-relaxed text-white/85 sm:text-[19px] ${art ? "max-w-[44ch]" : "max-w-[58ch]"}`}
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {lead}
          </p>
          {(cta || children) && (
            <div className="land-hero-text" style={{ "--i": 3 } as React.CSSProperties}>
              {cta && <Cta tone="light" className="mt-8" />}
              {children}
            </div>
          )}
          {art && (
            <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-2xl lg:hidden" aria-hidden>
              <Image src={art} alt="" fill loading="eager" sizes="(min-width: 1024px) 16px, 100vw" className="object-cover object-[70%_50%]" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page Sécurité ───────────────────────────────────────────────────────────
// Tout ce qui suit est aligné sur la politique de confidentialité et sur le
// code (12/10/2026) : base Supabase et application Vercel à Paris, Recall en
// région Europe (Francfort), vidéo jamais conservée par Brief, scope Gmail
// limité à l'envoi (Mail.Send côté Microsoft), message d'annonce du bot,
// cloisonnement par rôle. L'IA (Anthropic) n'est PAS hébergée en Europe :
// on le dit, plutôt que d'écrire « tout est en Europe ».
const SECURITY_POINTS = [
  {
    icon: Server,
    title: "Hébergé en Europe",
    body: "La base de données et l'application sont hébergées à Paris, les enregistrements des visios sont traités à Francfort.",
  },
  {
    icon: EyeOff,
    title: "La vidéo n'est pas conservée",
    body: "Brief garde la transcription et l'analyse d'un call, jamais la vidéo elle-même. Les liens de lecture sont temporaires.",
  },
  {
    icon: Bot,
    title: "Des participants informés",
    body: "En arrivant dans la visio, le bot « Brief Notetaker » annonce dans le chat qu'il enregistre, et propose de quitter la réunion si quelqu'un le préfère. Il ne rejoint pas vos réunions internes, reconnues à leur titre.",
  },
  {
    icon: Mail,
    title: "Aucune lecture de vos emails",
    body: "Sur Gmail comme sur Outlook, Brief n'a que le droit d'envoyer un email en votre nom, jamais celui de lire votre messagerie.",
  },
  {
    icon: Lock,
    title: "Chacun voit ce qu'il doit voir",
    body: "Un commercial voit ses calls et ses deals ; un manager, ceux des commerciaux qui lui sont rattachés. Les sessions d'entraînement restent privées : le manager n'en voit que des compteurs.",
  },
  {
    icon: Trash2,
    title: "Vos données vous appartiennent",
    body: "Pas de revente, suppression sur demande, chiffrement au repos et en transit. Conforme au RGPD.",
  },
];

export function SecurityContent() {
  return (
    <section className="border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal as="ul" spotlight className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_POINTS.map((p) => (
            <li key={p.title} className="land-spot rounded-[22px] border border-land-line bg-land-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-land-accent-soft text-land-accent">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-5 text-[18px] font-semibold tracking-tight text-land-ink">{p.title}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-land-muted">{p.body.replace(/« /g, `«${NB}`).replace(/ »/g, `${NB}»`)}</p>
            </li>
          ))}
        </Reveal>

      </div>
    </section>
  );
}
