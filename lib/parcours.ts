import { MODULES, type ModuleDefinition, type ModuleKey } from "./modules";

// Où en est un client dans son parcours de 8 semaines (document « Brief —
// Parcours client type »). Sans dépendance : testé directement
// (tests/parcours.test.ts), utilisé par l'espace « Suivi clients » de l'admin.

export const PARCOURS_LAST_WEEK = 8;

export type ParcoursState = {
  // Semaine en cours, de 0 (mise en route) à 8 (bilan) ; au-delà, le parcours
  // est terminé et la valeur reste 8. Null = pas de date de début.
  week: number | null;
  finished: boolean;
  // Prochain module du parcours pas encore ouvert, dans l'ordre des semaines.
  nextModule: ModuleDefinition | null;
  // Le prochain module aurait déjà dû être ouvert : sa semaine est passée.
  late: boolean;
  openCount: number;
  totalCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeParcours(
  startedAt: string | null,
  enabled: readonly ModuleKey[],
  now: Date = new Date()
): ParcoursState {
  const parcoursModules = MODULES.filter((m) => m.week !== null).sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
  const nextModule = parcoursModules.find((m) => !enabled.includes(m.key)) ?? null;

  let week: number | null = null;
  let finished = false;
  if (startedAt) {
    const start = new Date(`${startedAt.slice(0, 10)}T00:00:00`);
    const elapsedWeeks = Math.floor((now.getTime() - start.getTime()) / (7 * DAY_MS));
    week = Math.min(PARCOURS_LAST_WEEK, Math.max(0, elapsedWeeks));
    finished = elapsedWeeks > PARCOURS_LAST_WEEK;
  }

  return {
    week,
    finished,
    nextModule,
    late: week !== null && nextModule !== null && (nextModule.week ?? 0) < week,
    openCount: enabled.length,
    totalCount: MODULES.length,
  };
}
