// Deal Execution, étape 6 (27/10/2026) : le parcours de vente mesuré sur
// l'historique des étapes HubSpot — combien de temps un deal reste
// d'habitude à chaque étape, et quelle part passe à la suivante. C'est la
// partie C de la vue manager (décisions du 26/10/2026) et la base de la règle
// « deal à une étape plus longtemps que d'habitude » (reco 10, validée par
// Hubert). Sans dépendance : lib/crm/hubspot-deals.ts fournit les données,
// l'écran (composant client) importe les types.

export type PipelineStageDef = {
  id: string;
  label: string;
  // Ordre d'affichage dans le pipeline HubSpot.
  order: number;
  closed: boolean;
  // Gagné = étape fermée à probabilité 1 ; perdu = fermée à probabilité 0.
  won: boolean;
};

export type DealStageHistory = {
  id: string;
  // Changements d'étape, du plus ancien au plus récent (le premier est
  // l'étape de création).
  changes: { stageId: string; at: string }[];
};

export type StageStats = {
  stageId: string;
  label: string;
  order: number;
  // Deals passés par cette étape ou plus loin (gagnés compris), à condition
  // d'être entrés dans le pipeline à cette étape ou avant : un deal créé
  // directement à l'étape 4 ne dit rien du passage des étapes 1 à 3.
  reached: number;
  // Deals actuellement ouverts dans cette étape.
  current: number;
  // Durée médiane d'un passage terminé dans l'étape, en jours ; null sous
  // MIN_SAMPLES passages terminés.
  medianDays: number | null;
  durationSamples: number;
  // Part des deals « tranchés » à cette étape qui sont allés plus loin. Un
  // deal tranché a quitté l'étape (plus loin, perdu) ; ceux qui y sont encore
  // ne disent rien. null sous MIN_SAMPLES deals tranchés.
  passRate: number | null;
  decided: number;
};

export type PipelineStats = {
  pipelineId: string;
  pipelineLabel: string;
  dealCount: number;
  computedAt: string;
  stages: StageStats[];
};

// En dessous, une médiane ou un taux ne veut rien dire : on n'affiche rien.
export const MIN_SAMPLES = 5;

// Un deal est « plus longtemps que d'habitude » dans son étape au-delà de
// cette fois la durée médiane. Seuil par défaut, réglable par client plus tard
// (réponse 10 de Hubert : seuils propres au playbook de chaque client).
export const SLOW_STAGE_FACTOR = 1.5;

const DAY_MS = 24 * 60 * 60 * 1000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Les passages d'un deal dans chaque étape : entrée, sortie (null s'il y est
// encore). Deux changements successifs vers la même étape n'en font qu'un.
export function stageStays(history: DealStageHistory): { stageId: string; enteredAt: number; leftAt: number | null }[] {
  const changes = [...history.changes]
    .map((c) => ({ stageId: c.stageId, at: Date.parse(c.at) }))
    .filter((c) => Number.isFinite(c.at))
    .sort((a, b) => a.at - b.at);
  const stays: { stageId: string; enteredAt: number; leftAt: number | null }[] = [];
  for (const change of changes) {
    const last = stays.at(-1);
    if (last && last.stageId === change.stageId) continue;
    if (last) last.leftAt = change.at;
    stays.push({ stageId: change.stageId, enteredAt: change.at, leftAt: null });
  }
  return stays;
}

export function computePipelineStats(
  pipeline: { id: string; label: string; stages: PipelineStageDef[] },
  deals: DealStageHistory[],
  now: number
): PipelineStats {
  const byId = new Map(pipeline.stages.map((s) => [s.id, s]));
  const open = pipeline.stages.filter((s) => !s.closed).sort((a, b) => a.order - b.order);
  const wonOrder = Math.max(...pipeline.stages.filter((s) => s.won).map((s) => s.order), ...open.map((s) => s.order + 1));

  const durations = new Map<string, number[]>(open.map((s) => [s.id, []]));
  // Pour chaque deal : l'étape d'entrée, l'étape la plus avancée atteinte
  // (gagné = au-delà de toutes les étapes ouvertes ; perdu ne fait pas
  // avancer) et où il en est.
  const deals2 = deals.map((deal) => {
    const stays = stageStays(deal).filter((s) => byId.has(s.stageId));
    const firstStage = stays.length > 0 ? byId.get(stays[0].stageId)! : null;
    const first = firstStage && !firstStage.closed ? firstStage.order : Infinity;
    let furthest = -Infinity;
    for (const stay of stays) {
      const stage = byId.get(stay.stageId)!;
      if (stage.won) furthest = Math.max(furthest, wonOrder);
      else if (!stage.closed) furthest = Math.max(furthest, stage.order);
      if (!stage.closed && stay.leftAt !== null) durations.get(stage.id)!.push((stay.leftAt - stay.enteredAt) / DAY_MS);
    }
    const currentStage = stays.length > 0 ? byId.get(stays.at(-1)!.stageId)! : null;
    return { first, furthest, currentStage };
  });

  const stages: StageStats[] = open.map((stage) => {
    const reachedDeals = deals2.filter((d) => d.first <= stage.order && d.furthest >= stage.order);
    const current = deals2.filter((d) => d.currentStage?.id === stage.id).length;
    // Tranché à cette étape : n'y est plus (il l'a dépassée, ou il est fermé).
    const decided = reachedDeals.filter((d) => d.currentStage?.id !== stage.id);
    const passed = decided.filter((d) => d.furthest > stage.order).length;
    const samples = durations.get(stage.id)!;
    return {
      stageId: stage.id,
      label: stage.label,
      order: stage.order,
      reached: reachedDeals.length,
      current,
      medianDays: samples.length >= MIN_SAMPLES ? Math.round(median(samples) * 10) / 10 : null,
      durationSamples: samples.length,
      passRate: decided.length >= MIN_SAMPLES ? passed / decided.length : null,
      decided: decided.length,
    };
  });

  return {
    pipelineId: pipeline.id,
    pipelineLabel: pipeline.label,
    dealCount: deals.length,
    computedAt: new Date(now).toISOString(),
    stages,
  };
}

// Un deal ouvert qui reste dans son étape plus longtemps que d'habitude :
// au-delà de SLOW_STAGE_FACTOR fois la médiane, quand elle est connue.
export function slowStage(
  stats: PipelineStats[] | null | undefined,
  deal: { pipelineId?: string | null; stageId?: string | null; stageEnteredAt?: string | null; closed: boolean },
  now: number,
  factor: number = SLOW_STAGE_FACTOR
): { days: number; medianDays: number; samples: number; label: string } | null {
  if (!stats || deal.closed || !deal.stageId || !deal.stageEnteredAt) return null;
  const stage = stats.find((p) => p.pipelineId === deal.pipelineId)?.stages.find((s) => s.stageId === deal.stageId);
  if (!stage?.medianDays) return null;
  const days = Math.floor((now - Date.parse(deal.stageEnteredAt)) / DAY_MS);
  if (!Number.isFinite(days) || days <= stage.medianDays * factor) return null;
  return { days, medianDays: stage.medianDays, samples: stage.durationSamples, label: stage.label };
}
