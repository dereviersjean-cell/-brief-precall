// Briques des pages légales du site public (Confidentialité, Mentions
// légales), dans l'habillage du site : titres de section, puces, tableaux
// clé / valeur et lien souligné.

export const LEGAL_LINK =
  "font-medium text-land-ink underline decoration-land-line underline-offset-4 transition-colors hover:decoration-land-accent";

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-land-line pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-land-ink md:text-[28px]">{title}</h2>
      <div className="mt-5 space-y-4 text-[16px] leading-[1.7] text-land-muted">{children}</div>
    </section>
  );
}

export function LegalBullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-land-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-land-line rounded-[20px] bg-land-surface px-5 ring-1 ring-land-line sm:px-6">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] sm:gap-6">
          <dt className="text-[15px] font-medium text-land-ink">{k}</dt>
          <dd className="text-[15px] leading-relaxed text-land-muted">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Sommaire collant à gauche (grand écran). */
export function LegalToc({ sections }: { sections: { id: string; title: string }[] }) {
  return (
    <nav aria-label="Sommaire" className="hidden lg:block">
      <div className="sticky top-24">
        <div className="text-[13px] font-semibold uppercase tracking-[0.12em] text-land-faint">Sommaire</div>
        <ol className="mt-4 space-y-1 border-l border-land-line">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[14px] text-land-muted transition-colors hover:border-land-accent hover:text-land-ink"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
