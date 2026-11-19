import Link from "next/link";
import { Geist } from "next/font/google";
import { ChevronDown } from "lucide-react";
import { MobileMenu } from "@/app/components/landing/MobileMenu";
import { SALES_CONTACT } from "@/lib/sales-contact";

// Habillage commun des pages publiques : police, barre de navigation, pied de
// page.
// Menu du 19/11/2026 (cadrage GTM d'Hubert, « Website V2 ») : Accueil,
// Produit (un menu vers les deux pages par public), Comment ça marche (la
// page Accompagnement, le cadrage n'en donnant pas d'autre). Un seul appel à
// l'action sur tout le site, « Voir Brief en action », qui ouvre le planning
// de rendez-vous de lib/sales-contact.ts ; « Essayer gratuitement » n'y est
// plus (l'inscription libre reste joignable depuis « Se connecter »).
// Intégrations et Sécurité ne sont plus au menu : pied de page.

const sans = Geist({ subsets: ["latin"], variable: "--font-land-sans", display: "swap" });

export const CTA_LABEL = "Voir Brief en action";

const PRODUCT_LINKS = [
  { href: "/directeurs-commerciaux", label: "Directeurs commerciaux et dirigeants" },
  { href: "/commerciaux", label: "Commerciaux" },
];
const HOW_LINK = { href: "/accompagnement", label: "Comment ça marche" };

// Sous `lg`, pas de menu déroulant : les deux pages Produit sont à plat.
const MOBILE_LINKS = [{ href: "/", label: "Accueil" }, ...PRODUCT_LINKS, HOW_LINK];

const FOOTER_LINKS = [
  ...PRODUCT_LINKS,
  HOW_LINK,
  { href: "/integrations", label: "Intégrations" },
  { href: "/securite", label: "Sécurité" },
];

// Rayons : documents en 20 px, petites surfaces en 12 px, boutons et
// pastilles en pilule. Rien d'autre.
// Variante de la barre de navigation : plus compacte sur desktop, mais 40 px
// minimum au doigt.
const BTN_NAV =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full bg-land-accent px-4 text-[14px] font-medium text-land-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] lg:h-9";

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

const NAV_ITEM = "inline-flex h-10 items-center gap-1 transition-colors hover:text-land-ink";

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-land-line/70 bg-land-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <nav aria-label="Pages du site" className="hidden items-center gap-7 text-[14px] text-land-muted lg:flex">
          <Link href="/" className={NAV_ITEM}>
            Accueil
          </Link>
          {/* Menu Produit : ouvert au survol et au clavier (focus-within),
              sans JavaScript. Le panneau touche le bouton (pt-2 à
              l'intérieur) pour que le survol ne se perde pas en chemin. */}
          <div className="group relative">
            <button type="button" aria-haspopup="true" className={NAV_ITEM}>
              Produit <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
            </button>
            <div className="invisible absolute left-1/2 top-full w-[300px] -translate-x-1/2 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <ul className="rounded-2xl border border-land-line bg-land-surface p-1.5 shadow-[var(--land-shadow-lg)]">
                {PRODUCT_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="block rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-land-ink transition-colors hover:bg-land-sunken">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link href={HOW_LINK.href} className={NAV_ITEM}>
            {HOW_LINK.label}
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="hidden lg:inline-flex text-[14px] font-medium text-land-muted hover:text-land-ink transition-colors">
            Se connecter
          </Link>
          <a href={SALES_CONTACT.bookingUrl} target="_blank" rel="noopener noreferrer" className={BTN_NAV}>
            {CTA_LABEL}
          </a>
          <MobileMenu links={MOBILE_LINKS} />
        </div>
      </div>
    </header>
  );
}

const FOOTER_LINK = "inline-flex min-h-10 items-center hover:text-land-ink transition-colors md:min-h-0";

function Footer() {
  return (
    <footer className="border-t border-land-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-[14px] text-land-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <div className="whitespace-nowrap">© {new Date().getFullYear()} Brief</div>
        {/* 40 px de haut au doigt, hauteur de ligne sur desktop. */}
        <nav aria-label="Pages et liens légaux" className="flex flex-wrap gap-x-6 md:max-w-[60%] md:justify-end">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={FOOTER_LINK}>
              {l.label}
            </Link>
          ))}
          <Link href="/confidentialite" className={FOOTER_LINK}>Confidentialité</Link>
          <a href="mailto:contact@brief-ai.fr" className={FOOTER_LINK}>Nous contacter</a>
        </nav>
      </div>
    </footer>
  );
}

/** Enveloppe d'une page publique : police, jetons `.landing`, barre et pied. */
export function SiteChrome({ children, jsonLd }: { children: React.ReactNode; jsonLd?: object }) {
  return (
    <div className={`${sans.variable} landing min-h-screen`}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
