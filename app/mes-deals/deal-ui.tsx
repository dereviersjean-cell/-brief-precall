import type { DealState, DealVerdict } from "@/lib/deal-progress";

// Pièces d'affichage des deals partagées par « Deals », « Suivi des deals » et
// la page d'un deal. Sans "use client" : utilisables côté serveur comme côté
// navigateur.

export const VERDICTS: Record<DealVerdict, { label: string; tone: string; dot: string }> = {
  recul: { label: "En recul", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  arret: { label: "À l'arrêt", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  progres: { label: "En progrès", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

// Les cinq états affichés (réponse d'Hubert à D3, 13/11/2026).
export const STATES: Record<DealState, { label: string; tone: string; dot: string }> = {
  recul: { label: "En recul", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  relancer: { label: "À relancer", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  arret: { label: "À l'arrêt", tone: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  qualifier: { label: "À qualifier", tone: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  progres: { label: "En progrès", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

export function StateChip({ state }: { state: DealState }) {
  const s = STATES[state];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
