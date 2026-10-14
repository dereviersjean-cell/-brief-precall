import Link from "next/link";
import { Geist } from "next/font/google";
import { MobileMenu } from "@/app/components/landing/MobileMenu";

// Habillage commun des pages publiques : police, barre de navigation, pied de
// page. Le site est découpé en pages (12/10/2026) : la barre mène aux pages,
// plus à des ancres d'une page unique.

const sans = Geist({ subsets: ["latin"], variable: "--font-land-sans", display: "swap" });

const NAV_LINKS = [
  { href: "/produit", label: "Produit" },
  { href: "/accompagnement", label: "Accompagnement" },
  { href: "/integrations", label: "Intégrations" },
  { href: "/securite", label: "Sécurité" },
  { href: "/#faq", label: "FAQ" },
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

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-land-line/70 bg-land-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <nav aria-label="Pages du site" className="hidden lg:flex items-center gap-7 text-[14px] text-land-muted">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-land-ink transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="hidden lg:inline-flex text-[14px] font-medium text-land-muted hover:text-land-ink transition-colors">
            Se connecter
          </Link>
          <Link href="/inscription" className={BTN_NAV}>
            Essayer gratuitement
          </Link>
          <MobileMenu links={NAV_LINKS} />
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
        <div>© {new Date().getFullYear()} Brief</div>
        {/* 40 px de haut au doigt, hauteur de ligne sur desktop. */}
        <nav aria-label="Pages et liens légaux" className="flex flex-wrap gap-x-6">
          {NAV_LINKS.slice(0, 4).map((l) => (
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
