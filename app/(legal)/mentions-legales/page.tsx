import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Brief",
  description: "Mentions légales de Brief.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-[18px] font-semibold text-ink tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

// Champs [à compléter] : identité légale exacte de la société éditrice, à
// fournir par Jean avant publication — jamais inventés (raison sociale,
// SIREN/RCS, forme juridique, capital social, adresse du siège, TVA
// intracommunautaire, directeur de publication). Nom de la société
// volontairement absent (pas encore arbitré) — cf. consigne du 25/07/2026.
export default function LegalNoticePage() {
  return (
    <article>
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Informations légales</span>
      <h1 className="mt-3 text-[32px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
        Mentions <span className="italic-serif text-primary">légales</span>.
      </h1>

      <Section title="Éditeur du site">
        <p>Le site et le service Brief sont édités par :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Raison sociale : [à compléter]</li>
          <li>Forme juridique : [à compléter, ex. SAS]</li>
          <li>Capital social : [à compléter]</li>
          <li>Siège social : [à compléter : adresse complète]</li>
          <li>RCS / SIREN : [à compléter]</li>
          <li>N° de TVA intracommunautaire : [à compléter]</li>
          <li>
            Directeur de la publication : Jean de Reviers —{" "}
            <a href="mailto:hello@oliverlist.com" className="text-ink font-medium hover:text-primary transition-colors">
              hello@oliverlist.com
            </a>
          </li>
        </ul>
      </Section>

      <Section title="Hébergement">
        <p>
          Le service est hébergé par <b className="text-ink">Vercel Inc.</b> (vercel.com). La base de données est
          hébergée par <b className="text-ink">Supabase</b> (supabase.com). Les enregistrements et transcriptions des
          rendez-vous sont traités par <b className="text-ink">Recall.AI</b>, en région Europe.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du site et du service Brief (textes, marques, logos, interface, code) est la
          propriété de son éditeur ou de ses partenaires, sauf mention contraire, et ne peut être reproduit sans
          autorisation préalable.
        </p>
      </Section>

      <Section title="Accès au service">
        <p>
          Brief est un service à accès restreint : la création de compte se fait uniquement sur invitation d&apos;une
          organisation cliente. Il n&apos;existe pas d&apos;inscription libre.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Pour toute question relative au service, à ces mentions légales ou à vos données, contactez-nous à{" "}
          <a href="mailto:hello@oliverlist.com" className="text-ink font-medium hover:text-primary transition-colors">
            hello@oliverlist.com
          </a>
          . Pour tout ce qui concerne vos données personnelles, consultez notre{" "}
          <a href="/confidentialite" className="text-ink font-medium hover:text-primary transition-colors">
            politique de confidentialité
          </a>
          .
        </p>
      </Section>
    </article>
  );
}
