"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import AnimatedNumber from "./AnimatedNumber";

function TrendBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) {
    return <span className="text-xs text-slate-400">· stable</span>;
  }
  const up = delta > 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 15 }}
      className={`text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
    </motion.span>
  );
}

const ACCENTS: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-[color:var(--lavender)]", text: "text-[color:var(--violet)]" },
  violet: { bg: "bg-[color:var(--lavender)]", text: "text-[color:var(--violet)]" },
  emerald: { bg: "bg-[color:var(--success-soft)]", text: "text-emerald-700" },
  amber: { bg: "bg-[color:var(--warning-soft)]", text: "text-amber-700" },
  rose: { bg: "bg-[color:var(--danger-soft)]", text: "text-rose-700" },
};

export default function StatTile({
  label,
  value,
  decimals = 0,
  suffix,
  detail,
  icon,
  accent = "indigo",
  trend,
  index = 0,
}: {
  label: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
  detail?: string;
  icon?: ReactNode;
  accent?: keyof typeof ACCENTS;
  trend?: { current: number; previous: number | null };
  index?: number;
}) {
  const colors = ACCENTS[accent] ?? ACCENTS.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.12)" }}
      className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {icon && (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-3xl font-bold text-slate-900 tabular-nums">
          {value !== null ? (
            <>
              <AnimatedNumber value={value} decimals={decimals} />
              {suffix && <span className="text-base font-medium text-slate-300 ml-0.5">{suffix}</span>}
            </>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </p>
        {trend && value !== null && <TrendBadge current={trend.current} previous={trend.previous} />}
        {detail && <span className="text-xs text-slate-400">{detail}</span>}
      </div>
    </motion.div>
  );
}
