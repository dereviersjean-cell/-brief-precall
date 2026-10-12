import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_URL } from "@/lib/app-url";
import { SALES_CONTACT, BRIEFS_ACCESS_DAILY_LIMIT } from "@/lib/sales-contact";
import { MobileMenu } from "@/app/components/landing/MobileMenu";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Newspaper,
  Target,
  BarChart3,
  ClipboardCheck,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Check,
  ShieldCheck,
  Globe2,
  Mic,
  Plus,
} from "lucide-react";

// Refonte octobre 2026. Même contenu et même architecture que la version de
// juillet (promesse unique « taux de closing », problème, méthode en trois
// temps calquée sur l'app, managers, preuve, intégrations, FAQ), nouvelle
// direction visuelle : neutres froids, un seul accent émeraude, Geist, plus
// de dégradé ni de halo. Palette scopée sous `.landing` (globals.css) : l'app
// connectée n'est pas touchée.
//
// Les aperçus produit sont des extraits de documents (un brief, une analyse,
// la bibliothèque d'objections), pas des captures d'écran simulées : pas de
// fausse fenêtre ni de fausse barre latérale. Les chiffres qu'ils portent sont
// des exemples et sont présentés comme tels.

const sans = Geist({ subsets: ["latin"], variable: "--font-land-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-land-mono", display: "swap" });

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

// Libellés du menu inchangés (repères des visiteurs déjà venus, ancres
// citées ailleurs).
const NAV_LINKS = [
  { href: "#probleme", label: "Le problème" },
  { href: "#methode", label: "La méthode" },
  { href: "#manager", label: "Managers" },
  { href: "#integrations", label: "Intégrations" },
  { href: "#faq", label: "FAQ" },
];

// Rayons : surfaces en 16 px, boutons et pastilles en pilule. Rien d'autre.
const BTN_PRIMARY =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-land-accent px-5 text-[15px] font-medium text-land-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-land-accent";
// Variante de la barre de navigation : plus compacte sur desktop, mais 40 px
// minimum au doigt.
const BTN_NAV =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-land-accent px-4 text-[14px] font-medium text-land-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] md:h-9";
const BTN_SECONDARY =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-land-line bg-land-surface px-5 text-[15px] font-medium text-land-ink transition-[background-color,transform] hover:bg-land-sunken active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-land-accent";

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Brief, accueil">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-land-ink text-[13px] font-semibold text-land-bg">
        B
      </span>
      <span className="text-[16px] font-semibold tracking-tight text-land-ink">Brief</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-land-line bg-land-bg/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <nav aria-label="Sections de la page" className="hidden md:flex items-center gap-7 text-[14px] text-land-muted">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-land-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="hidden md:inline-flex text-[14px] font-medium text-land-muted hover:text-land-ink transition-colors">
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

// ─── Hero ────────────────────────────────────────────────────────────────────

function BriefSample() {
  // Extrait d'un brief tel que l'app le produit : contact enrichi avec sa
  // séniorité, chiffres clés, actualité, accroche, vocabulaire du secteur du
  // prospect. Entreprise et personne fictives.
  return (
    <figure className="w-full">
      <div className="land-enter rounded-2xl border border-land-line bg-land-surface shadow-[var(--land-shadow)]">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <span className="text-[13px] font-medium text-land-accent">Brief pré-call</span>
          <span className="font-mono text-[12.5px] text-land-muted">Jeudi 14:30</span>
        </div>
        <div className="px-5 pb-5 pt-2 sm:px-6">
          <div className="text-[19px] font-semibold tracking-tight text-land-ink">Présentation Valdor Emballages</div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-[14px] text-land-ink">Claire Mercier, directrice des opérations</span>
            <span className="inline-flex items-center rounded-full bg-land-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-land-accent">
              Décisionnaire
            </span>
          </div>
        </div>

        <dl className="land-enter grid grid-cols-3 border-y border-land-line" style={{ "--i": 2 } as React.CSSProperties}>
          {[
            ["Effectifs", "140"],
            ["CA 2025", "21 M€"],
            ["Fondée", "1998"],
          ].map(([k, v], i) => (
            <div key={k} className={`px-5 py-3.5 sm:px-6 ${i > 0 ? "border-l border-land-line" : ""}`}>
              <dt className="text-[12px] text-land-muted">{k}</dt>
              <dd className="mt-0.5 font-mono text-[16px] font-medium text-land-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="land-enter space-y-4 px-5 py-5 sm:px-6" style={{ "--i": 4 } as React.CSSProperties}>
          <div>
            <div className="text-[12px] font-medium text-land-muted">Actualité</div>
            <ul className="mt-1.5 space-y-1 text-[14px] leading-snug text-land-ink">
              <li>Nouvelle ligne de production à Angers, annoncée le 2 octobre.</li>
              <li>Recrutement d&apos;un responsable supply chain.</li>
            </ul>
          </div>
          <div>
            <div className="text-[12px] font-medium text-land-accent">Accroche suggérée</div>
            <p className="mt-1 text-[15px] font-medium leading-snug text-land-ink">
              « Vous ouvrez une ligne à Angers : qui pilote la montée en charge côté approvisionnement ? »
            </p>
          </div>
          <div>
            <div className="text-[12px] font-medium text-land-muted">Vocabulaire du secteur</div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {["carton ondulé", "taux de rebut", "PPWR", "mono-matériau"].map((w) => (
                <li key={w} className="rounded-full border border-land-line px-2.5 py-0.5 text-[12.5px] text-land-ink">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-[12.5px] text-land-muted">Exemple de brief. Entreprise et contact fictifs.</figcaption>
    </figure>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
      <div>
        <h1 className="text-balance text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] text-land-ink sm:text-[54px] lg:text-[62px]">
          Augmentez votre taux de closing.
        </h1>
        <p className="mt-5 max-w-[34rem] text-[18px] leading-relaxed text-land-muted">
          Brief prépare chaque rendez-vous de vos commerciaux, débriefe chaque call selon votre méthode et fait
          circuler ce qui gagne dans l&apos;équipe.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/login" className={BTN_PRIMARY}>
            Essayer gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#methode" className={BTN_SECONDARY}>
            Voir la méthode
          </a>
        </div>
      </div>
      <BriefSample />
    </section>
  );
}

// Ce que le hero ne peut pas porter (règle des quatre éléments) : pour qui,
// comment ça se branche, qui l'édite. Juste sous le pli.
function ContextStrip() {
  return (
    <section aria-label="Pour qui" className="border-y border-land-line bg-land-sunken">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1.2fr_1fr] md:gap-12">
        <p className="text-[15px] leading-relaxed text-land-ink">
          Brief se connecte à votre agenda Google ou Outlook et à votre messagerie. La veille de chaque rendez-vous,
          le brief est prêt ; après chaque visio, le call est analysé.
        </p>
        <p className="text-[14px] leading-relaxed text-land-muted">
          Conçu pour les PME et ETI françaises : éditeurs SaaS, cabinets de conseil, agences B2B, industrie et
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
    <section id="probleme" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div>
          <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-land-ink md:text-[42px]">
            Votre meilleur commercial close 2 à 3 fois plus que les autres.
          </h2>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-land-muted">
            Pas une question de talent : il arrive mieux préparé, il connaît déjà les objections, et il ajuste son
            discours à chaque étape. Ça s&apos;apprend, à condition que ce soit visible.
          </p>
          <ul className="mt-8 divide-y divide-land-line border-t border-land-line">
            {[
              ["Zéro rendez-vous mal préparé", "Un dossier complet sur le prospect, prêt à lire en 3 minutes, avant chaque rendez-vous."],
              ["Zéro call non débriefé", "Chaque visio est analysée et notée selon votre playbook, sans réécouter 40 minutes."],
              ["Zéro leçon perdue", "Les objections bien traitées profitent à toute l'équipe, pas seulement à celui qui les a vécues."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3 py-4">
                <Check className="mt-1 h-4 w-4 shrink-0 text-land-accent" />
                <div>
                  <div className="text-[15.5px] font-medium text-land-ink">{title}</div>
                  <div className="mt-0.5 text-[14.5px] leading-relaxed text-land-muted">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <figure className="self-center">
          <figcaption className="text-[13px] text-land-muted">Taux de closing par commercial, équipe type</figcaption>
          <div className="mt-6 space-y-5">
            {team.map(([name, pct, top]) => (
              <div key={name}>
                <div className="flex items-baseline justify-between">
                  <span className={`text-[14px] ${top ? "font-medium text-land-ink" : "text-land-muted"}`}>{name}</span>
                  <span className={`font-mono text-[15px] ${top ? "font-medium text-land-accent" : "text-land-muted"}`}>
                    {pct} %
                  </span>
                </div>
                <div
                  className={`mt-2 h-2 rounded-full ${top ? "bg-land-accent" : "bg-land-line"}`}
                  style={{ width: `${(pct / 40) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-land-line pt-5 text-[15px] leading-relaxed text-land-ink">
            <span className="font-medium">L&apos;enjeu n&apos;est pas de recruter plus.</span>{" "}
            <span className="text-land-muted">
              Ramener le reste de l&apos;équipe à mi-chemin du top performer double le chiffre, avec le même pipeline.
            </span>
          </p>
        </figure>
      </div>
    </section>
  );
}

// ─── La méthode ──────────────────────────────────────────────────────────────

type Pillar = {
  verb: string;
  title: string;
  body: string;
  items: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }[];
  preview: React.ReactNode;
};

function ReferencePreview() {
  return (
    <div className="rounded-2xl border border-land-line bg-land-surface p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[13px] font-medium text-land-accent">
        <Target className="h-4 w-4" /> Référence client la plus proche
      </div>
      <div className="mt-3 text-[16px] font-medium text-land-ink">Éditeur SaaS RH, 220 personnes</div>
      <div className="mt-1 text-[14px] text-land-muted">Même taille, même CRM, même sujet d&apos;attribution.</div>
      <p className="mt-4 border-t border-land-line pt-4 text-[14.5px] leading-relaxed text-land-ink">
        « Une équipe avec exactement votre stack et le même sujet d&apos;attribution : on lui a fait gagner un
        trimestre. »
      </p>
    </div>
  );
}

function ScorecardPreview() {
  const dims: [string, number][] = [
    ["Personnalisation de la démo", 4.0],
    ["Traitement des objections", 3.0],
    ["Implication des décideurs", 2.5],
    ["Prochaine étape obtenue", 4.0],
  ];
  return (
    <div className="rounded-2xl border border-land-line bg-land-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          {["R1 Découverte", "R2 Présentation", "R3 Closing"].map((s, i) => (
            <span
              key={s}
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                i === 1 ? "bg-land-ink text-land-bg" : "border border-land-line text-land-muted"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <span className="font-mono text-[15px] font-medium text-land-ink">
          3,4<span className="text-land-muted"> / 5</span>
        </span>
      </div>
      <ul className="space-y-3.5 px-5 py-5 sm:px-6">
        {dims.map(([label, v]) => (
          <li key={label}>
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="text-land-muted">{label}</span>
              <span className="font-mono text-land-ink">{v.toFixed(1).replace(".", ",")}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-land-ink/80" style={{ width: `${(v / 5) * 100}%` }} />
          </li>
        ))}
      </ul>
      <div className="border-t border-land-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-land-warn">
          <AlertTriangle className="h-3.5 w-3.5" /> Objection à <span className="font-mono">21:04</span>
        </div>
        <p className="mt-1 text-[14.5px] leading-snug text-land-ink">
          « Notre équipe est déjà surchargée, une nouvelle intégration me fait peur. »
        </p>
      </div>
    </div>
  );
}

function ObjectionLibraryPreview() {
  const rows = [
    { o: "« On est déjà engagés avec un concurrent »", n: 23, good: 61, partial: 24 },
    { o: "« C'est trop cher pour notre taille »", n: 17, good: 47, partial: 29 },
    { o: "« Il faut que j'en parle à mon associé »", n: 14, good: 38, partial: 21 },
  ];
  return (
    <div className="rounded-2xl border border-land-line bg-land-surface">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <span className="text-[13px] font-medium text-land-accent">Bibliothèque d&apos;objections de l&apos;équipe</span>
      </div>
      <ul className="divide-y divide-land-line px-5 sm:px-6">
        {rows.map((r) => (
          <li key={r.o} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14.5px] font-medium leading-snug text-land-ink">{r.o}</p>
              <span className="shrink-0 font-mono text-[13px] text-land-muted">×{r.n}</span>
            </div>
            <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              <span className="bg-land-accent" style={{ width: `${r.good}%` }} />
              <span className="bg-land-accent/40" style={{ width: `${r.partial}%` }} />
              <span className="bg-land-line" style={{ width: `${100 - r.good - r.partial}%` }} />
            </div>
            <div className="mt-1.5 text-[12.5px] text-land-muted">
              <span className="font-mono text-land-accent">{r.good} %</span> bien traitées
            </div>
          </li>
        ))}
      </ul>
      <div className="h-1" />
    </div>
  );
}

const PILLARS: Pillar[] = [
  {
    verb: "Préparer",
    title: "Arrivez en rendez-vous en connaissant votre prospect.",
    body: "La veille de chaque rendez-vous, Brief compile un dossier prêt à lire en 3 minutes. Fini les 20 minutes éparpillées entre LinkedIn, Pappers et le site du prospect.",
    items: [
      { icon: Building2, title: "Fiche entreprise sourcée", body: "Effectifs, CA, dirigeants, financement : depuis Pappers, LinkedIn et le web." },
      { icon: Newspaper, title: "Signaux récents", body: "Levées de fonds, recrutements clés, mentions presse des 60 derniers jours." },
      { icon: Target, title: "La bonne référence client", body: "Brief pioche dans vos cas clients celui qui ressemble le plus au prospect." },
    ],
    preview: <ReferencePreview />,
  },
  {
    verb: "Débriefer",
    title: "Chaque call noté selon votre méthode et son étape.",
    body: "Le bot rejoint la visio, transcrit en français, puis l'IA note le call selon votre playbook. Un R1 de découverte n'est pas jugé comme un R3 de closing : Brief reconnaît l'étape depuis le titre du rendez-vous.",
    items: [
      { icon: BarChart3, title: "Scoring sur votre playbook", body: "Vos dimensions, vos critères, votre pondération, importés depuis Notion ou un document." },
      { icon: ClipboardCheck, title: "Analyse par étape R1, R2, R3", body: "Découverte, présentation, closing : des consignes dédiées à chaque étape du cycle." },
      { icon: AlertTriangle, title: "Objections et signaux", body: "Objections, concurrents cités, temps de parole : détectés automatiquement." },
    ],
    preview: <ScorecardPreview />,
  },
  {
    verb: "Progresser",
    title: "Ce qui fait gagner un deal profite à toute l'équipe.",
    body: "Chaque objection traitée nourrit une bibliothèque commune. Le commercial junior répond comme s'il avait dix ans de maison, et vous savez enfin où les deals se perdent.",
    items: [
      { icon: MessageSquare, title: "Bibliothèque d'objections vivante", body: "Face à une objection, Brief retrouve les cas similaires déjà traités par l'équipe, et ce qui a marché." },
      { icon: TrendingUp, title: "Ce qui marche, chiffré", body: "Pour chaque objection : combien de fois elle revient, et à quel point l'équipe la traite bien." },
      { icon: BookOpen, title: "Scores comparés dans le temps", body: "Les dimensions du playbook où chacun progresse, et celles qui restent à travailler." },
    ],
    preview: <ObjectionLibraryPreview />,
  },
];

function MethodSection() {
  return (
    <section id="methode" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
        {/* Colonne collante : le cadre reste visible pendant qu'on lit les trois temps. */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[14px] font-medium text-land-accent">La méthode</p>
          <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-land-ink md:text-[42px]">
            Trois moments. Un seul objectif : le closing.
          </h2>
          <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-land-muted">
            Brief s&apos;organise exactement comme le travail d&apos;un commercial : préparer le rendez-vous, le
            débriefer, et progresser d&apos;un call à l&apos;autre. Rien d&apos;autre.
          </p>
          <ol className="mt-8 hidden space-y-2 lg:block">
            {PILLARS.map((p) => (
              <li key={p.verb}>
                <a
                  href={`#${p.verb.toLowerCase()}`}
                  className="text-[15px] font-medium text-land-muted hover:text-land-ink transition-colors"
                >
                  {p.verb}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-20 lg:space-y-28">
          {PILLARS.map((p) => (
            <article key={p.verb} id={p.verb.toLowerCase()} className="scroll-mt-24">
              <h3 className="text-[15px] font-semibold text-land-accent">{p.verb}</h3>
              <p className="mt-2 text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-land-ink md:text-[28px]">
                {p.title}
              </p>
              <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-land-muted">{p.body}</p>
              <div className="mt-8">{p.preview}</div>
              <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {p.items.map(({ icon: Icon, title, body }) => (
                  <li key={title}>
                    <Icon className="h-4 w-4 text-land-accent" />
                    <div className="mt-2 text-[14.5px] font-medium text-land-ink">{title}</div>
                    <div className="mt-1 text-[14px] leading-relaxed text-land-muted">{body}</div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Managers ────────────────────────────────────────────────────────────────

function ManagerSection() {
  return (
    <section id="manager" className="scroll-mt-20 border-t border-land-line bg-land-sunken">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-land-line bg-land-surface p-6 sm:p-8 lg:col-span-2">
            <p className="text-[14px] font-medium text-land-muted">Pour les directeurs commerciaux</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-land-ink md:text-[38px]">
              Coachez sur des faits, plus sur des impressions.
            </h2>
            <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-land-muted">
              Vous définissez le playbook et les étapes de votre cycle. Brief les applique à chaque call et vous
              remonte ce qui compte : qui progresse, où les deals se perdent.
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px] text-land-ink">
              {[
                "Playbook de notation éditable, avec des consignes propres à chaque étape R1, R2, R3.",
                "Objections les plus fréquentes, et la façon dont l'équipe les traite.",
                "Bilan hebdomadaire : forces, axes de progrès, deals à surveiller.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-land-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <figure className="flex flex-col rounded-2xl bg-land-ink p-6 text-land-bg sm:p-8">
            <figcaption className="text-[14px] font-medium opacity-70">Où se perdent les deals</figcaption>
            <dl className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["R1", "12"],
                ["R2", "31"],
                ["R3", "9"],
              ].map(([s, v]) => (
                <div key={s}>
                  <dt className="text-[13px] opacity-60">{s}</dt>
                  <dd className={`mt-1 font-mono text-[30px] font-medium tracking-tight ${s === "R2" ? "" : "opacity-55"}`}>
                    {v}
                    <span className="text-[15px] opacity-60"> %</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-auto pt-8 text-[14px] leading-relaxed opacity-75">
              Exemple : le R2 concentre les pertes, les démos manquent de décideurs. Sujet du prochain point
              d&apos;équipe.
            </p>
          </figure>

          <figure className="rounded-2xl bg-land-accent-soft p-6 sm:p-8 lg:col-span-3">
            <figcaption className="text-[14px] font-medium text-land-accent">Bilan de la semaine, exemple</figcaption>
            <blockquote className="mt-3 max-w-[70ch] text-[18px] leading-relaxed text-land-ink md:text-[20px]">
              Les deals qui avancent ont tous eu une démo dans les 5 jours suivant la découverte. L&apos;objection
              « intégration Salesforce » revient sur 3 deals qui stagnent.
            </blockquote>
          </figure>
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
      <figure className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
        <blockquote className="text-[26px] font-medium leading-[1.3] tracking-[-0.02em] text-land-ink md:text-[34px]">
          « On sait enfin pourquoi on gagne un deal, et pourquoi on en perd. Nos commerciaux arrivent préparés, et
          les objections ne prennent plus personne de court. »
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-land-accent-soft text-[13px] font-semibold text-land-accent">
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
    { title: "CRM", items: ["HubSpot", "Pipedrive", "Sellsy (bientôt)"] },
    { title: "Playbook et équipe", items: ["Notion", "Slack", "Import Word ou PDF"] },
  ];
  return (
    <section id="integrations" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <h2 className="max-w-[22ch] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-land-ink md:text-[42px]">
          Se branche sur votre stack.
        </h2>
        <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-land-muted">
          Briefs et analyses arrivent là où vos commerciaux travaillent déjà : CRM, agenda, email. Pas un nouvel
          outil quotidien à imposer.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {groups.map((g) => (
            <div key={g.title} className="border-t border-land-ink pt-4">
              <div className="text-[14px] font-semibold text-land-ink">{g.title}</div>
              <ul className="mt-3 space-y-1.5 text-[15px] text-land-muted">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-[14px] text-land-muted">
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-land-accent" /> Conforme au RGPD
          </li>
          <li className="inline-flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-land-accent" /> Enregistrements hébergés en Europe
          </li>
          <li className="inline-flex items-center gap-2">
            <Mic className="h-4 w-4 text-land-accent" /> Participants informés de l&apos;enregistrement
          </li>
        </ul>
      </div>
    </section>
  );
}

function Faq() {
  const qas = [
    {
      q: "Comment Brief augmente concrètement le taux de closing ?",
      a: "En travaillant trois leviers : arriver préparé, savoir ce qui a marché ou pas (un débrief noté, adapté à l'étape R1, R2 ou R3), et capitaliser en équipe grâce à la bibliothèque d'objections.",
    },
    {
      q: "Comment Brief rejoint mes rendez-vous ?",
      a: "Vous connectez votre agenda Google ou Outlook. Brief détecte les visios (Meet, Teams, Zoom) et envoie un bot pour enregistrer et transcrire. Vous pouvez exclure des rendez-vous manuellement.",
    },
    {
      q: "Comment fonctionne l'analyse par étape R1, R2, R3 ?",
      a: "Le manager configure une fois les motifs de titre de rendez-vous (« Rencontre X » pour la découverte, « Présentation X » pour la démo…) et les consignes propres à chaque étape. Brief évalue ensuite chaque call selon les critères de son étape, entièrement modifiables : un R1 n'est pas jugé comme un R3.",
    },
    {
      q: "Que deviennent les enregistrements ?",
      a: "Hébergement européen, chiffrement au repos et en transit, suppression sur demande. Chaque participant est informé de l'enregistrement, conformément au RGPD.",
    },
    {
      q: "Puis-je tester Brief ?",
      a: `Oui. Créez votre compte avec Google ou Microsoft et préparez jusqu'à ${BRIEFS_ACCESS_DAILY_LIMIT} briefs par jour, sans carte bancaire. L'analyse des calls et le suivi d'équipe se mettent en place avec nous : prenez rendez-vous, on configure Brief pour votre équipe.`,
    },
  ];
  return (
    <section id="faq" className="scroll-mt-20 border-t border-land-line">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
        <h2 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-land-ink md:text-[38px]">
          Questions fréquentes
        </h2>
        <div className="divide-y divide-land-line border-y border-land-line">
          {qas.map((qa) => (
            <details key={qa.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium text-land-ink [&::-webkit-details-marker]:hidden">
                {qa.q}
                <Plus className="h-4 w-4 shrink-0 text-land-muted transition-transform group-open:rotate-45" />
              </summary>
              <p className="max-w-[62ch] pb-6 text-[15px] leading-relaxed text-land-muted">{qa.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:pb-28">
      <div className="mx-auto max-w-6xl rounded-2xl bg-land-accent px-6 py-14 text-land-accent-ink sm:px-12 md:py-20">
        <h2 className="max-w-[18ch] text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[48px]">
          Prêt à closer plus ?
        </h2>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed opacity-85">
          Créez votre compte et préparez vos prochains rendez-vous dès aujourd&apos;hui. Pour l&apos;analyse des
          calls et le suivi d&apos;équipe, parlons de votre équipe.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-land-accent-ink px-5 text-[15px] font-medium text-land-accent transition-transform hover:opacity-95 active:scale-[0.98]"
          >
            Essayer gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={SALES_CONTACT.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-current/30 px-5 text-[15px] font-medium transition-[background-color,transform] hover:bg-black/10 active:scale-[0.98]"
          >
            Prendre rendez-vous <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-land-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-[14px] text-land-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <div>© {new Date().getFullYear()} Brief, édité par Oliverlist</div>
        <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/mentions-legales" className="hover:text-land-ink transition-colors">Mentions légales</Link>
          <Link href="/confidentialite" className="hover:text-land-ink transition-colors">Confidentialité</Link>
          <a href="mailto:hello@oliverlist.com" className="hover:text-land-ink transition-colors">Nous contacter</a>
        </nav>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className={`${sans.variable} ${mono.variable} landing min-h-screen`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Nav />
      <main>
        <Hero />
        <ContextStrip />
        <ProblemSection />
        <MethodSection />
        <ManagerSection />
        <Testimonial />
        <Integrations />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
