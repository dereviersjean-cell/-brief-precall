import type { ReactNode } from "react";

// Porté du mockup Lovable (app-shell.tsx), juillet 2026 — en-tête de page
// standard (eyebrow + titre + sous-titre + actions) réutilisé par toutes les
// pages migrées vers le nouveau design system.
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
    <div className="flex items-start justify-between gap-6 pb-1">
      <div className="min-w-0">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[color:var(--violet)]">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-2 text-[28px] leading-[1.15] font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}
