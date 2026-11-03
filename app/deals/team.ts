import type { DealProgress } from "@/lib/deal-progress";
import type { AiPersonAdvice } from "@/lib/deal-memory-schema";

// Un commercial de l'équipe vu par son manager (Suivi des deals) : son
// activité, ses deals, le conseil Haiku sur lui.
export type TeamPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  week: number;
  lastAt: string | null;
  deals: DealProgress[];
  // Le conseil Haiku sur la personne (lib/person-advice-ai.ts, 28/10/2026) ;
  // absent, le bloc n'affiche pas de conseil.
  aiAdvice?: AiPersonAdvice | null;
};
