import type { SuiviDeal } from "@/lib/deal-suivi";

// Un commercial de l'équipe vu par son manager (Suivi des deals) : ses deals
// tels que la vue « Par commercial » les affiche, et le conseil Haiku sur lui.
export type TeamPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  deals: SuiviDeal[];
  advice: { title: string; why: string } | null;
};
