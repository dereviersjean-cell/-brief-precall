import type { ReactNode } from "react";

// Primitives visuelles partagées — portées du mockup Lovable (ui-bits.tsx),
// juillet 2026, puis alignées sur le site public (octobre 2026). Couleurs via
// les tokens de app/globals.css (var(--violet), var(--lavender), etc.).
//
// Le langage visuel du site, à suivre dans les écrans de l'app :
//   - cartes : rounded-2xl, border border-border, fond blanc, SANS ombre ;
//   - étiquettes de section : text-[11px] font-semibold uppercase
//     tracking-[0.07em] text-slate-500 ;
//   - chiffres clés : semibold, leading-none, tracking-tight, tabular-nums ;
//   - encadré d'accent : rounded-2xl bg-[color:var(--lavender)], étiquette
//     en text-[color:var(--violet)] ;
//   - pastilles : rounded-full px-2 py-0.5 text-[11.5px] font-semibold ;
//   - pas de dégradé, pas de halo, pas d'effet de soulèvement au survol.

// ---- Button system ----
type BtnVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type BtnSize = "sm" | "md";
export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  className = "",
  ...rest
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--violet)]/40";
  const sizes = {
    sm: "h-8 px-2.5 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
  }[size];
  const variants = {
    // Dégradé bleu vers violet, comme « Ajouter un RDV » sur la page Brief.
    primary:
      "bg-gradient-to-r from-[#2A5CE0] to-[#6A4BE8] text-white shadow-[0_8px_20px_-12px_rgba(76,63,214,0.8)] hover:brightness-110 active:brightness-95",
    secondary:
      "bg-white border border-border text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-[var(--shadow-xs)]",
    outline:
      "border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] text-[color:var(--violet)] hover:bg-white",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger:
      "bg-white border border-[color:var(--danger-soft)] text-rose-700 hover:bg-[color:var(--danger-soft)]",
  }[variant];
  return (
    <button className={`${base} ${sizes} ${variants} ${className}`} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

// La surface commune des cartes (harmonisée le 14/10/2026 sur le style de la
// page Brief) : liseré lavande et ombre bleutée plutôt qu'une bordure grise.
export const SURFACE =
  "rounded-[20px] bg-white ring-1 ring-[color:var(--lavender-strong)] shadow-[0_1px_2px_rgba(42,92,224,0.05),0_10px_28px_-20px_rgba(42,92,224,0.35)]";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`${SURFACE} ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function scoreTone(v: number | null) {
  if (v == null)
    return { bar: "bg-slate-200", text: "text-slate-400", chip: "bg-slate-100 text-slate-500" };
  if (v >= 3.5)
    return {
      bar: "bg-[color:var(--success)]",
      text: "text-emerald-700",
      chip: "bg-[color:var(--success-soft)] text-emerald-700",
    };
  if (v >= 2)
    return {
      bar: "bg-[color:var(--warning)]",
      text: "text-amber-700",
      chip: "bg-[color:var(--warning-soft)] text-amber-700",
    };
  return {
    bar: "bg-[color:var(--danger)]",
    text: "text-rose-700",
    chip: "bg-[color:var(--danger-soft)] text-rose-700",
  };
}

export function ScoreChip({ value }: { value: number | null }) {
  const t = scoreTone(value);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${t.chip}`}
    >
      {value == null ? "—" : `${value.toFixed(1)}/5`}
    </span>
  );
}

export function SentimentChip({ value }: { value: "positif" | "neutre" | "négatif" | null }) {
  const map = {
    positif: "bg-[color:var(--success-soft)] text-emerald-700",
    neutre: "bg-slate-100 text-slate-600",
    négatif: "bg-[color:var(--danger-soft)] text-rose-700",
  };
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${map[value]}`}>
      {value}
    </span>
  );
}

export function Eyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">
      {icon}
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon,
  tone = "lavender",
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "lavender" | "green" | "amber" | "rose";
}) {
  const bg = {
    lavender: "bg-[color:var(--lavender)] text-[color:var(--violet)]",
    green: "bg-[color:var(--success-soft)] text-emerald-700",
    amber: "bg-[color:var(--warning-soft)] text-amber-700",
    rose: "bg-[color:var(--danger-soft)] text-rose-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
          {label}
        </div>
        {icon && <div className={`grid h-8 w-8 place-items-center rounded-lg ${bg}`}>{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-[30px] font-semibold tracking-tight tabular-nums text-slate-900 leading-none">
          {value}
        </div>
        {suffix && <div className="text-[14px] font-medium text-slate-400">{suffix}</div>}
      </div>
      {hint && <div className="mt-2 text-[12px] text-slate-500">{hint}</div>}
    </div>
  );
}

export function StatusChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const map = {
    success: "bg-[color:var(--success-soft)] text-emerald-700",
    warning: "bg-[color:var(--warning-soft)] text-amber-700",
    danger: "bg-[color:var(--danger-soft)] text-rose-700",
    neutral: "bg-slate-100 text-slate-600",
    info: "bg-[color:var(--lavender)] text-[color:var(--violet)]",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${map}`}
    >
      {children}
    </span>
  );
}
