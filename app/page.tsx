import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { APP_URL } from "@/lib/app-url";
import { SALES_CONTACT, BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { MobileMenu } from "@/app/components/landing/MobileMenu";
import { Journey, type JourneyStep } from "@/app/components/landing/Journey";
import { HeroStage } from "@/app/components/landing/HeroStage";
import { AnalysisObject } from "@/app/components/landing/AnalysisObject";
import { BriefSheet, SourcesObject, ObjectionObject, DigestObject } from "@/app/components/landing/objects";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Globe2, Mic, Plus } from "lucide-react";

// Refonte d'octobre 2026, seconde passe (12/10/2026). Direction retenue par
// Jean : « un deal, trois moments ». La page suit UN rendez-vous — Valdor
// Emballages, jeudi 14:30 — de sa préparation à la bibliothèque d'objections
// de l'équipe, l'objet produit se transformant au défilement, dans la
// grammaire des pages produit d'Apple : une idée par écran, des titres en
// grand, le produit au centre. Accent : le bleu de marque de l'app.
//
// Les aperçus produit sont des extraits de documents (un brief, une grille,
// la bibliothèque d'objections), pas des captures simulées : pas de fausse
// fenêtre ni de fausse barre latérale. Entreprises, personnes et chiffres
// sont des exemples et sont présentés comme tels.
//
// Typographie française : les espaces avant « : ; ? ! » et à l'intérieur des
// guillemets sont des espaces insécables (U+00A0), invisibles dans l'éditeur.
// Sans elles, un « ? » ou un « : » tombait seul en début de ligne. Chiffres
// et heures en Geist à chasse fixe (`tabular-nums`), pas de police mono.

const sans = Geist({ subsets: ["latin"], variable: "--font-land-sans", display: "swap" });

// Inchangée : c'est aussi la description lue par les robots et par la
// vérification Google (cf. commentaire de `metadata`).
const DESCRIPTION =
  "Brief est une application web pour les équipes commerciales B2B. Elle se connecte à votre agenda Google et à votre messagerie Gmail pour préparer chaque rendez-vous, débriefer chaque call selon votre méthode de vente, et faire circuler ce qui gagne dans toute l'équipe.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  // Titre réduit au seul nom de l'application (20/08/2026). La vérification
  // Google a retenu « the app name shown on your OAuth consent screen does not
  // match the app name on your home page » : le nom déclaré est « Brief », et
  // un titre « Brief — Augmentez le taux de closing… » ne se réduit pas à
  // « Brief » de façon fiable pour un contrôle automatique. La promesse
  // commerciale reste dans le h1 et dans la meta description, que les moteurs
  // lisent tout autant. Coût de référencement nul : au 20/08 la page n'a
  // jamais été explorée par Googlebot. À rétablir une fois la vérification
  // obtenue, si le titre long est jugé préférable.
  title: "Brief",
  description: DESCRIPTION,
  applicationName: "Brief",
  openGraph: {
    // siteName déclare le nom du produit de façon lisible par une machine.
    // Sans lui, le nom de l'app ne se déduit que du texte de la page — c'est
    // exactement le grief « the app name does not match the app name on your
    // home page » renvoyé par la vérification Google en août 2026.
    siteName: "Brief",
    title: "Brief",
    description: DESCRIPTION,
    url: APP_URL,
    type: "website",
    locale: "fr_FR",
  },
};

// Même intention que openGraph.siteName, sous la forme que les robots
// consomment en priorité : une déclaration explicite du nom, de l'objet et
// de l'éditeur de l'application, à la racine du domaine autorisé.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Brief",
  url: APP_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "fr-FR",
  description: DESCRIPTION,
  publisher: { "@type": "Organization", name: "Oliverlist", url: APP_URL },
};

// Libellés et ancres inchangés (repères des visiteurs déjà venus, ancres
// citées ailleurs) ; l'ordre suit celui de la page.
const NAV_LINKS = [
  { href: "#methode", label: "La méthode" },
  { href: "#probleme", label: "Le problème" },
  { href: "#manager", label: "Managers" },
  { href: "#integrations", label: "Intégrations" },
  { href: "#faq", label: "FAQ" },
];

// Rayons : documents en 20 px, petites surfaces en 12 px, boutons et
// pastilles en pilule. Rien d'autre.
const BTN_PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-land-accent px-6 text-[16px] font-medium text-land-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-land-accent";
// Variante de la barre de navigation : plus compacte sur desktop, mais 40 px
// minimum au doigt.
const BTN_NAV =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-land-accent px-4 text-[14px] font-medium text-land-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] lg:h-9";
const BTN_SECONDARY =
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-[16px] font-medium text-land-accent transition-[background-color,transform] hover:bg-land-accent-soft active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-land-accent";

// Titres de section en deux tons : l'affirmation en encre, la suite en gris.
// C'est la seule hiérarchie dont ils ont besoin — pas de surtitre.
const H2 = "text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] md:text-[52px] lg:text-[60px]";

function BrandMark() {
  return (
    <Link href="/" className="inline-flex h-11 items-center gap-2" aria-label="Brief, accueil">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-accent text-[13px] font-semibold text-land-accent-ink">
        B
      </span>
      <span className="text-[16px] font-semibold tracking-tight text-land-ink">Brief</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-land-line/70 bg-land-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <nav aria-label="Sections de la page" className="hidden lg:flex items-center gap-7 text-[14px] text-land-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-land-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="hidden lg:inline-flex text-[14px] font-medium text-land-muted hover:text-land-ink transition-colors">
            Se connecter
          </Link>
          <Link href="/login" className={BTN_NAV}>
            Essayer gratuitement
          </Link>
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}

// ─── Haut de page ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <HeroStage
      copy={
        <div className="px-4 pt-14 text-center sm:px-6 md:pt-20 lg:pt-16">
          <h1 className="mx-auto max-w-[14ch] text-[46px] font-semibold leading-[1] tracking-[-0.04em] text-land-ink sm:text-[68px] lg:text-[96px]">
            Augmentez votre taux de closing.
          </h1>
          <p className="mx-auto mt-6 max-w-[38rem] text-[18px] leading-relaxed text-land-muted sm:text-[20px]">
            Brief prépare chaque rendez-vous de vos commerciaux, débriefe chaque call selon votre méthode et fait
            circuler ce qui gagne dans l&apos;équipe.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={BTN_PRIMARY}>
              Essayer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#methode" className={BTN_SECONDARY}>
              Voir la méthode <ArrowRight className="h-4 w-4 rotate-90" />
            </a>
          </div>
        </div>
      }
      sheet={
        <div className="px-4 pb-20 pt-14 sm:px-6 md:pt-16 lg:pb-0">
          <BriefSheet />
        </div>
      }
      bridge={
        <div className="[&_h2]:text-[52px]">
          <MethodIntro />
        </div>
      }
    />
  );
}

// Ce que le haut de page ne peut pas porter : comment ça se branche, pour
// qui. Une phrase en grand, à la manière d'Apple, plutôt qu'un bandeau.
function Statement() {
  return (
    <section aria-label="Comment ça marche" className="border-t border-land-line">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        <p className="text-[26px] font-semibold leading-[1.25] tracking-[-0.025em] md:text-[38px]">
          <span className="text-land-ink">Brief se connecte à votre agenda Google ou Outlook et à votre messagerie.</span>{" "}
          <span className="text-land-faint">
            La veille de chaque rendez-vous, le brief est prêt ; après chaque visio, le call est analysé.
          </span>
        </p>
        <p className="mt-8 max-w-[60ch] text-[15px] leading-relaxed text-land-muted">
          Conçu pour les PME et ETI françaises : éditeurs SaaS, cabinets de conseil, agences B2B, industrie et
          services, recrutement spécialisé. Hébergement européen, édité par Oliverlist.
        </p>
      </div>
    </section>
  );
}

// ─── Le problème ─────────────────────────────────────────────────────────────

function ProblemSection() {
  const team: [string, number, boolean][] = [
    ["Top performer", 38, true],
    ["Commercial B", 17, false],
    ["Commercial C", 14, false],
    ["Commercial D", 11, false],
  ];
  return (
    <section id="probleme" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[18ch]`}>
          <span className="text-land-ink">Votre meilleur commercial close 2 à 3 fois plus que les autres.</span>
        </h2>
        <p className="mt-6 max-w-[56ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
          Pas une question de talent : il arrive mieux préparé, il connaît déjà les objections, et il ajuste son
          discours à chaque étape. Ça s&apos;apprend, à condition que ce soit visible.
        </p>

        <figure className="mt-14 lg:mt-20">
          <figcaption className="text-[13px] text-land-muted">Taux de closing par commercial, équipe type (exemple)</figcaption>
          <div className="mt-6 space-y-5">
            {team.map(([name, pct, top]) => (
              <div key={name} className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-4 sm:grid-cols-[9rem_minmax(0,1fr)_4rem]">
                <span className={`text-[14.5px] ${top ? "font-medium text-land-ink" : "text-land-muted"}`}>{name}</span>
                <div className="h-3 rounded-full bg-land-sunken">
                  <div
                    className={`land-grow-x h-full rounded-full ${top ? "bg-land-accent" : "bg-land-faint/45"}`}
                    style={{ width: `${(pct / 40) * 100}%` }}
                  />
                </div>
                <span
                  className={`text-right text-[18px] tabular-nums tracking-tight ${top ? "font-semibold text-land-accent" : "text-land-muted"}`}
                >
                  {pct} %
                </span>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-[60ch] text-[17px] leading-relaxed">
            <span className="font-medium text-land-ink">L&apos;enjeu n&apos;est pas de recruter plus.</span>{" "}
            <span className="text-land-muted">
              Ramener le reste de l&apos;équipe à mi-chemin du top performer, c&apos;est près de 50 % de deals gagnés en plus, avec le même pipeline.
            </span>
          </p>
        </figure>

        <ul className="mt-16 grid grid-cols-1 gap-8 border-t border-land-line pt-10 md:grid-cols-3 lg:mt-20">
          {[
            ["Zéro rendez-vous mal préparé", "Un dossier complet sur le prospect, prêt à lire en 3 minutes, avant chaque rendez-vous."],
            ["Zéro call non débriefé", "Chaque visio est analysée et notée selon votre playbook, sans réécouter 40 minutes."],
            ["Zéro leçon perdue", "Les objections bien traitées profitent à toute l'équipe, pas seulement à celui qui les a vécues."],
          ].map(([title, body]) => (
            <li key={title}>
              <div className="text-[19px] font-semibold tracking-tight text-land-ink">{title}</div>
              <div className="mt-2 text-[15px] leading-relaxed text-land-muted">{body}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── La méthode : un deal, trois moments ─────────────────────────────────────

const STEPS: JourneyStep[] = [
  {
    verb: "Préparer",
    when: "Mercredi 18:00",
    title: "Arrivez en connaissant votre prospect.",
    body: "La veille, Brief compile un dossier prêt à lire en 3 minutes. Finies les 20 minutes éparpillées entre LinkedIn, Pappers et le site du prospect.",
    points: [
      { title: "Fiche entreprise sourcée", body: "Effectifs, CA, dirigeants, financement : depuis les registres officiels, les annuaires professionnels et le web." },
      { title: "Signaux récents", body: "Levées de fonds, recrutements clés, mentions presse des 90 derniers jours." },
      { title: "La bonne référence client", body: "Brief pioche dans vos cas clients celui qui ressemble le plus au prospect." },
    ],
    object: <SourcesObject />,
  },
  {
    verb: "Débriefer",
    when: "Jeudi 15:20",
    title: "Chaque call noté selon votre méthode et son étape.",
    body: "Le bot rejoint la visio, transcrit en français, puis l'IA note le call sur le playbook de votre équipe. Brief reconnaît l'étape depuis le titre du rendez-vous : essayez de noter ce même call comme un R1 ou un R3.",
    points: [
      { title: "Scoring sur votre playbook", body: "Vos dimensions, vos critères, votre pondération, importés depuis Notion ou un document." },
      { title: "Analyse par étape R1, R2, R3", body: "Découverte, présentation, closing : des consignes dédiées à chaque étape du cycle." },
      { title: "Objections et signaux", body: "Objections, concurrents cités, temps de parole : détectés automatiquement." },
    ],
    object: <AnalysisObject />,
  },
  {
    verb: "Progresser",
    when: "Lundi 08:00",
    title: "Ce qui fait gagner un deal profite à toute l'équipe.",
    body: "Chaque objection traitée nourrit une bibliothèque commune. Le commercial junior répond comme s'il avait dix ans de maison, et vous voyez enfin sur quelles objections l'équipe lâche.",
    points: [
      { title: "Bibliothèque d'objections vivante", body: "Face à une objection, Brief retrouve les cas similaires déjà traités par l'équipe, et ce qui a marché." },
      { title: "Ce qui marche, chiffré", body: "Pour chaque objection : combien de fois elle revient, et à quel point l'équipe la traite bien." },
      { title: "Scores comparés dans le temps", body: "Les dimensions du playbook où chacun progresse, et celles qui restent à travailler." },
    ],
    object: <ObjectionObject />,
  },
];

// Introduction de « La méthode ». Rendue deux fois, une seule visible : dans
// la section (téléphone, tablette, mouvement réduit) ou, en mode épinglé, à
// gauche du brief replié en fin de haut de page (cf. HeroStage).
function MethodIntro() {
  return (
    <>
      <h2 className={`${H2} max-w-[16ch]`}>
        <span className="text-land-ink">Trois moments.</span>{" "}
        <span className="text-land-faint">Un seul objectif : le closing.</span>
      </h2>
      <p className="mt-6 max-w-[54ch] text-[18px] leading-relaxed text-land-muted md:text-[20px]">
        Suivez un rendez-vous, de la veille au point d&apos;équipe. Brief s&apos;organise exactement comme le
        travail d&apos;un commercial, rien d&apos;autre.
      </p>
    </>
  );
}

function MethodSection() {
  return (
    <section id="methode" className="land-method scroll-mt-20 border-t border-land-line">
      <div className="land-method-intro mx-auto max-w-6xl px-4 pt-20 sm:px-6 lg:pt-32">
        <MethodIntro />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <Journey steps={STEPS} />
      </div>
    </section>
  );
}

// ─── Managers ────────────────────────────────────────────────────────────────

function ManagerSection() {
  // Score moyen de l'équipe par dimension du playbook : ce que l'onglet
  // Performance › Scores affiche réellement. La dimension la plus faible
  // n'est signalée que si elle décroche nettement des autres (même règle que
  // l'app : plus de 0,3 point d'écart). Remplace le graphique « où se perdent
  // les deals » du premier jet : Brief n'a pas aujourd'hui de données
  // gagné/perdu (table deal_outcomes vide), il ne peut pas le promettre.
  const dims: [string, string, number][] = [
    ["Démo", "Personnalisation de la démo", 3.8],
    ["Objections", "Traitement des objections", 2.7],
    ["Décideurs", "Implication des décideurs", 3.3],
    ["Suite", "Prochaine étape obtenue", 3.9],
  ];
  const weakest = Math.min(...dims.map(([, , v]) => v));
  return (
    <section id="manager" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[15ch]`}>
          <span className="text-land-ink">Coachez sur des faits.</span>{" "}
          <span className="text-land-faint">Plus sur des impressions.</span>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-14 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <p className="max-w-[48ch] text-[18px] leading-relaxed text-land-muted">
              Vous définissez le playbook et les étapes de votre cycle. Brief les applique à chaque call et vous
              remonte ce qui compte : qui progresse, et sur quoi l&apos;équipe lâche.
            </p>
            <ul className="mt-8 space-y-4 text-[16px] text-land-ink">
              {[
                "Playbook de notation éditable, avec des consignes propres à chaque étape R1, R2, R3.",
                "Objections les plus fréquentes, et la façon dont l'équipe les traite.",
                "Bilan hebdomadaire : ce qui a fonctionné, points d'attention, ce qu'il ne faut pas oublier.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-land-accent" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure>
            <figcaption className="text-[13px] text-land-muted">
              Score moyen de l&apos;équipe par dimension du playbook, sur 5 (exemple)
            </figcaption>
            <div className="mt-6 grid h-64 grid-cols-4 items-end gap-3 border-b border-land-line sm:gap-5">
              {dims.map(([short, full, v]) => {
                const weak = v === weakest;
                return (
                  <div key={short} className="flex h-full flex-col justify-end" title={full}>
                    <div
                      className={`text-[24px] font-semibold tabular-nums tracking-tight sm:text-[30px] ${
                        weak ? "text-land-accent" : "text-land-muted"
                      }`}
                    >
                      {v.toFixed(1).replace(".", ",")}
                    </div>
                    <div
                      className={`land-grow-y mt-3 rounded-t-xl ${weak ? "bg-land-accent" : "bg-land-faint/30"}`}
                      style={{ height: `${(v / 5) * 78}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 text-[13px] text-land-muted sm:gap-5 sm:text-[13.5px]">
              {dims.map(([short, , v]) => (
                <span key={short} className={v === weakest ? "font-medium text-land-ink" : undefined}>
                  {short}
                  {v === weakest && <span className="block text-[12.5px] font-normal text-land-accent">à travailler</span>}
                </span>
              ))}
            </div>
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

// ─── Preuve ──────────────────────────────────────────────────────────────────

function Testimonial() {
  // Vrai témoignage client (confirmé par Jean le 12/10/2026). Seuls les tirets
  // de ponctuation ont été remplacés par des virgules ; les mots sont les siens.
  return (
    <section className="border-t border-land-line">
      <figure className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:py-36">
        <blockquote className="text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] text-land-ink md:text-[46px]">
          « On sait enfin pourquoi on gagne un deal, et pourquoi on en perd.{" "}
          <span className="text-land-faint">
            Nos commerciaux arrivent préparés, et les objections ne prennent plus personne de court. »
          </span>
        </blockquote>
        <figcaption className="mt-10 inline-flex items-center gap-3 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-land-accent-soft text-[14px] font-semibold text-land-accent">
            CD
          </span>
          <div>
            <div className="text-[15px] font-medium text-land-ink">Camille Duval</div>
            <div className="text-[14px] text-land-muted">Head of Sales, éditeur SaaS B2B</div>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

function Integrations() {
  const groups = [
    { title: "Visio", items: ["Google Meet", "Microsoft Teams", "Zoom"] },
    { title: "Agenda et mail", items: ["Google Agenda", "Gmail", "Outlook"] },
    { title: "CRM", items: ["HubSpot", "Pipedrive"] },
    { title: "Playbook et équipe", items: ["Notion", "Slack", "Import Word ou PDF"] },
  ];
  return (
    <section id="integrations" className="scroll-mt-20 border-t border-land-line bg-land-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-32">
        <h2 className={`${H2} max-w-[16ch]`}>
          <span className="text-land-ink">Se branche sur votre stack.</span>{" "}
          <span className="text-land-faint">Rien de plus à ouvrir le matin.</span>
        </h2>
        <p className="mt-6 max-w-[56ch] text-[18px] leading-relaxed text-land-muted">
          Briefs et analyses arrivent là où vos commerciaux travaillent déjà : CRM, agenda, email. Pas un nouvel
          outil quotidien à imposer.
        </p>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g.title} className="border-t-2 border-land-ink pt-4">
              <div className="text-[14px] font-semibold text-land-ink">{g.title}</div>
              <ul className="mt-3 space-y-1.5 text-[16px] text-land-muted">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-land-muted">
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-land-accent" aria-hidden /> Conforme au RGPD
          </li>
          <li className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-land-accent" aria-hidden /> Enregistrements hébergés en Europe
          </li>
          <li className="inline-flex items-center gap-2">
            <Mic className="h-4 w-4 text-land-accent" aria-hidden /> Participants informés de l&apos;enregistrement
          </li>
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const qas = [
    {
      q: "Comment Brief augmente concrètement le taux de closing ?",
      a: "En travaillant trois leviers : arriver préparé, savoir ce qui a marché ou pas (un débrief noté, adapté à l'étape R1, R2 ou R3), et capitaliser en équipe grâce à la bibliothèque d'objections.",
    },
    {
      q: "Comment Brief rejoint mes rendez-vous ?",
      a: "Vous connectez votre agenda Google ou Outlook. Brief détecte les visios (Meet, Teams, Zoom) et envoie un bot pour enregistrer et transcrire. Vous pouvez exclure des rendez-vous manuellement.",
    },
    {
      q: "Comment fonctionne l'analyse par étape R1, R2, R3 ?",
      a: "Le manager configure une fois les motifs de titre de rendez-vous (« Rencontre X » pour la découverte, « Présentation X » pour la démo…) et les consignes propres à chaque étape. Brief évalue ensuite chaque call selon les critères de son étape, entièrement modifiables : un R1 n'est pas jugé comme un R3.",
    },
    {
      q: "Que deviennent les enregistrements ?",
      a: "Hébergement européen, chiffrement au repos et en transit, suppression sur demande. Chaque participant est informé de l'enregistrement, conformément au RGPD.",
    },
    {
      q: "Puis-je tester Brief ?",
      a: `Oui. Créez votre compte avec Google ou Microsoft et préparez jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour, sans carte bancaire. L'analyse des calls et le suivi d'équipe se mettent en place avec nous : prenez rendez-vous, on configure Brief pour votre équipe.`,
    },
  ];
  return (
    <section id="faq" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-32">
        <h2 className="text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-land-ink md:text-[44px]">
          Questions fréquentes
        </h2>
        <div className="divide-y divide-land-line border-y border-land-line">
          {qas.map((qa) => (
            <details key={qa.q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium text-land-ink transition-colors hover:text-land-accent [&::-webkit-details-marker]:hidden">
                {qa.q}
                <Plus className="h-4 w-4 shrink-0 text-land-muted transition-transform duration-300 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="max-w-[62ch] pb-6 text-[15.5px] leading-relaxed text-land-muted">{qa.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    // Gouttière portée par l'enveloppe, comme toutes les autres sections : le
    // bloc s'aligne sur la grille au lieu de la déborder.
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:pb-28">
      <div className="rounded-[28px] bg-land-accent px-6 py-16 text-center text-land-accent-ink sm:px-12 md:py-24">
        <h2 className="mx-auto max-w-[14ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[64px]">
          Prêt à closer plus ?
        </h2>
        <p className="mx-auto mt-6 max-w-[46ch] text-[18px] leading-relaxed opacity-90">
          Créez votre compte et préparez vos prochains rendez-vous dès aujourd&apos;hui. Pour l&apos;analyse des
          calls et le suivi d&apos;équipe, parlons de votre équipe.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full bg-land-accent-ink px-6 text-[16px] font-medium text-land-accent transition-transform hover:opacity-95 active:scale-[0.98]"
          >
            Essayer gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={SALES_CONTACT.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-current/35 px-6 text-[16px] font-medium transition-[background-color,transform] hover:bg-black/10 active:scale-[0.98]"
          >
            Prendre rendez-vous <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINK = "inline-flex min-h-10 items-center hover:text-land-ink transition-colors md:min-h-0";

function Footer() {
  return (
    <footer className="border-t border-land-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-[14px] text-land-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <div>© {new Date().getFullYear()} Brief, édité par Oliverlist</div>
        {/* 40 px de haut au doigt, hauteur de ligne sur desktop. */}
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-6">
          <Link href="/mentions-legales" className={FOOTER_LINK}>Mentions légales</Link>
          <Link href="/confidentialite" className={FOOTER_LINK}>Confidentialité</Link>
          <a href="mailto:hello@oliverlist.com" className={FOOTER_LINK}>Nous contacter</a>
        </nav>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className={`${sans.variable} landing min-h-screen`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Nav />
      <main>
        {/* « La méthode » suit directement le haut de page : le brief replié
            au défilement y est repris par l'étape « Préparer ». */}
        <Hero />
        <MethodSection />
        <ProblemSection />
        <ManagerSection />
        <Testimonial />
        <Statement />
        <Integrations />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
