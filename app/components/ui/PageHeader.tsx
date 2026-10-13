import type { ReactNode } from "react";

// En-tête de page standard (eyebrow + titre + sous-titre + actions), porté du
// mockup Lovable en juillet 2026 puis aligné sur le site public en octobre :
// l'eyebrow n'est plus une pastille encadrée mais une petite étiquette en
// capitales, le titre prend la graisse et l'approche des titres du site.
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    // Empilé sous `sm`, côte à côte au-delà.
    //
    // La rangée était `flex justify-between` avec des actions en `shrink-0` :
    // sur 390 px, les boutons prenaient tout et le bloc titre était comprimé à
    // une centaine de pixels — « Bonjour Jean » tombait à un mot par ligne, le
    // sous-titre aussi, la pastille d'eyebrow chevauchait le premier bouton, et
    // le dernier bouton sortait de l'écran. `min-w-0` ne suffisait pas : il
    // autorise la colonne à rétrécir, il ne l'empêche pas de disparaître face à
    // un voisin qui refuse de céder un pixel.
    <div className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-1.5 text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {/* `flex-wrap` sous `sm` : trois boutons ne tiennent pas sur une ligne de
          390 px, ils passent à la ligne au lieu de déborder. */}
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">{actions}</div>}
    </div>
  );
}
