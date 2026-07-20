import type { ReactNode } from "react";

// Primitives visuelles partagées — portées du mockup Lovable (ui-bits.tsx),
// juillet 2026. Couleurs via les tokens de app/globals.css (var(--violet),
// var(--lavender), etc.) — voir la note "Rebrand" en tête de ce fichier CSS.

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
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--violet)]/40";
  const sizes = {
    sm: "h-8 px-2.5 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
  }[size];
  const variants = {
    primary:
      "brand-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-110 active:brightness-95",
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
      className={`rounded-2xl border border-border bg-white shadow-[var(--shadow-sm)] ${
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular-nums ${t.chip}`}
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-medium ${map[value]}`}>
      {value}
    </span>
  );
}

export function Eyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--lavender)] px-3 py-1 text-[11px] font-medium tracking-wide text-[color:var(--violet)]">
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
    <div className="group rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </div>
        {icon && <div className={`grid h-9 w-9 place-items-center rounded-xl ${bg} group-hover:scale-105 transition-transform`}>{icon}</div>}
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <div className="text-[34px] font-semibold tracking-tight text-slate-900 leading-none">
          {value}
        </div>
        {suffix && <div className="text-[15px] text-slate-400">{suffix}</div>}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${map}`}
    >
      {children}
    </span>
  );
}
