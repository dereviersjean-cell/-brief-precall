import type { DealVerdict } from "@/lib/deal-progress";

// Pièces d'affichage des deals partagées par « Deals », « Suivi des deals » et
// la page d'un deal. Sans "use client" : utilisables côté serveur comme côté
// navigateur.

export const VERDICTS: Record<DealVerdict, { label: string; tone: string; dot: string }> = {
  recul: { label: "En recul", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  arret: { label: "À l'arrêt", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  progres: { label: "En progrès", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};
