import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero } from "@/app/components/landing/sections";
import { LEGAL_LINK, LegalSection, LegalTable } from "@/app/components/landing/legal";

// Mentions légales, passées le 13/10/2026 dans l'habillage du site public
// (elles vivaient dans le layout minimal de `app/(legal)`, supprimé).
//
// Champs [à compléter] : identité légale exacte de la société éditrice, à
// fournir par Jean avant publication — jamais inventés (raison sociale,
// SIREN/RCS, forme juridique, capital social, adresse du siège, TVA
// intracommunautaire). Nom de la société volontairement absent (pas encore
// arbitré) — cf. consigne du 25/07/2026. La société n'existe pas encore
// (29/09/2026).

export const metadata: Metadata = {
  title: "Mentions légales · Brief",
  description: "Mentions légales de Brief : éditeur, hébergement, propriété intellectuelle et contact.",
};

const CONTACT = (
  <a href="mailto:contact@brief-ai.fr" className={LEGAL_LINK}>
    contact@brief-ai.fr
  </a>
);

// Page masquée (Jean, 13/10/2026) tant que la société n'existe pas : elle
// répond 404, n'est plus liée nulle part ni listée dans le sitemap. Pour la
// remettre : PUBLISHED = true, puis rétablir les liens du pied de page
// (SiteChrome.tsx), de la page de connexion et l'entrée du sitemap.
const PUBLISHED = false;

export default function LegalNoticePage() {
  if (!PUBLISHED) notFound();
  return (
    <SiteChrome>
      <PageHero
        label="Informations légales"
        title="Mentions légales."
        lead="Qui édite Brief, où le service est hébergé, et comment nous joindre."
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <article className="max-w-[72ch] space-y-10">
          <LegalSection id="editeur" title="Éditeur du site">
            <p>Le site et le service Brief sont édités par :</p>
            <LegalTable
              rows={[
                ["Raison sociale", "[à compléter]"],
                ["Forme juridique", "[à compléter]"],
                ["Capital social", "[à compléter]"],
                ["Siège social", "[à compléter]"],
                ["RCS / SIREN", "[à compléter]"],
                ["N° de TVA intracommunautaire", "[à compléter]"],
                ["Directeur de la publication", <>Jean de Reviers · {CONTACT}</>],
              ]}
            />
          </LegalSection>

          <LegalSection id="hebergement" title="Hébergement">
            <LegalTable
              rows={[
                ["Application", <>Vercel Inc. (vercel.com), région Paris</>],
                ["Base de données", <>Supabase (supabase.com), région Paris</>],
                ["Enregistrements et transcriptions", <>Recall.ai, région Europe (Francfort)</>],
              ]}
            />
            <p>
              Ce que chaque traitement implique pour vos données figure dans notre{" "}
              <Link href="/confidentialite" className={LEGAL_LINK}>
                politique de confidentialité
              </Link>
              .
            </p>
          </LegalSection>

          <LegalSection id="propriete" title="Propriété intellectuelle">
            <p>
              L&apos;ensemble des éléments du site et du service Brief (textes, marques, logos, interface, code) est la
              propriété de son éditeur ou de ses partenaires, sauf mention contraire, et ne peut être reproduit sans
              autorisation préalable.
            </p>
          </LegalSection>

          <LegalSection id="acces" title="Accès au service">
            <p>
              Un compte Brief se crée depuis la page de connexion, avec un compte Google ou Microsoft. Un manager peut
              aussi inviter les commerciaux de son équipe.
            </p>
          </LegalSection>

          <LegalSection id="contact" title="Contact">
            <p>
              Pour toute question relative au service ou à ces mentions légales, écrivez-nous à {CONTACT}. Pour tout ce
              qui concerne vos données personnelles, consultez notre{" "}
              <Link href="/confidentialite" className={LEGAL_LINK}>
                politique de confidentialité
              </Link>
              .
            </p>
          </LegalSection>
        </article>
      </div>
    </SiteChrome>
  );
}
