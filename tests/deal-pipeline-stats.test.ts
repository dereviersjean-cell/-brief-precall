import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computePipelineStats, slowStage, stageStays, MIN_SAMPLES, type DealStageHistory, type PipelineStageDef } from "../lib/deal-pipeline-stats";
import { buildBoard, buildStages, buildTeam, type BoardFicheRow } from "../lib/deal-board";

// Verrouille le parcours mesuré sur HubSpot : une durée ou un taux faux se lit
// comme un fait sur l'équipe, et la règle « étape plus longue que d'habitude »
// en dépend.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const day = (n: number) => new Date(Date.parse("2026-01-01T00:00:00Z") + n * 86400000).toISOString();

const STAGES: PipelineStageDef[] = [
  { id: "a", label: "Découverte", order: 0, closed: false, won: false },
  { id: "b", label: "Proposition", order: 1, closed: false, won: false },
  { id: "c", label: "Négociation", order: 2, closed: false, won: false },
  { id: "won", label: "Gagné", order: 3, closed: true, won: true },
  { id: "lost", label: "Perdu", order: 4, closed: true, won: false },
];
const pipeline = { id: "p", label: "Ventes", stages: STAGES };
const deal = (id: string, ...steps: [string, number][]): DealStageHistory => ({ id, changes: steps.map(([stageId, d]) => ({ stageId, at: day(d) })) });
const stage = (stats: ReturnType<typeof computePipelineStats>, id: string) => stats.stages.find((s) => s.stageId === id)!;

describe("stageStays", () => {
  test("deux changements vers la même étape ne font qu'un passage, dans l'ordre des dates", () => {
    const stays = stageStays({ id: "x", changes: [{ stageId: "b", at: day(5) }, { stageId: "a", at: day(0) }, { stageId: "a", at: day(2) }] });
    assert.deepEqual(stays.map((s) => [s.stageId, s.leftAt !== null]), [["a", true], ["b", false]]);
    assert.equal(stays[0].leftAt! - stays[0].enteredAt, 5 * 86400000);
  });
});

describe("computePipelineStats", () => {
  test("durée habituelle = médiane des passages terminés, rien sous le minimum d'échantillons", () => {
    const deals = [2, 4, 6, 8, 100].map((d, i) => deal(`d${i}`, ["a", 0], ["b", d]));
    const stats = computePipelineStats(pipeline, deals, NOW);
    assert.equal(stage(stats, "a").medianDays, 6);
    assert.equal(stage(stats, "a").durationSamples, 5);
    // Un deal encore dans l'étape n'a pas de durée terminée.
    assert.equal(stage(stats, "b").medianDays, null);
    assert.equal(computePipelineStats(pipeline, deals.slice(0, MIN_SAMPLES - 1), NOW).stages[0].medianDays, null);
  });

  test("taux de passage : parmi les deals tranchés à l'étape, ceux qui sont allés plus loin", () => {
    const deals = [
      deal("1", ["a", 0], ["b", 3]),
      deal("2", ["a", 0], ["b", 3], ["c", 9]),
      deal("3", ["a", 0], ["won", 9]),
      deal("4", ["a", 0], ["lost", 4]),
      deal("5", ["a", 0], ["lost", 5]),
      // Encore en Découverte : ne dit rien du passage.
      deal("6", ["a", 0]),
      deal("7", ["a", 0]),
    ];
    const a = stage(computePipelineStats(pipeline, deals, NOW), "a");
    assert.equal(a.reached, 7);
    assert.equal(a.current, 2);
    assert.equal(a.decided, 5);
    assert.equal(a.passRate, 3 / 5);
  });

  test("une étape sautée compte comme passée, un deal gagné a dépassé toutes les étapes ouvertes", () => {
    const deals = Array.from({ length: 5 }, (_, i) => deal(`s${i}`, ["a", 0], ["c", 4], ["won", 8]));
    const stats = computePipelineStats(pipeline, deals, NOW);
    assert.equal(stage(stats, "b").reached, 5);
    assert.equal(stage(stats, "b").passRate, 1);
    assert.equal(stage(stats, "c").passRate, 1);
    // Aucun passage dans Proposition : pas de durée.
    assert.equal(stage(stats, "b").durationSamples, 0);
  });

  test("un deal créé en cours de parcours ne compte qu'à partir de son étape d'entrée", () => {
    const stats = computePipelineStats(pipeline, [deal("mid", ["c", 0], ["won", 3]), deal("closed", ["won", 0])], NOW);
    assert.equal(stage(stats, "a").reached, 0);
    assert.equal(stage(stats, "b").reached, 0);
    assert.equal(stage(stats, "c").reached, 1);
  });

  test("un deal perdu n'avance pas, et revenir en arrière ne fait pas passer", () => {
    const deals = [
      ...Array.from({ length: 4 }, (_, i) => deal(`l${i}`, ["a", 0], ["b", 2], ["lost", 6])),
      deal("back", ["a", 0], ["b", 2], ["a", 5]),
    ];
    const b = stage(computePipelineStats(pipeline, deals, NOW), "b");
    assert.equal(b.decided, 5);
    assert.equal(b.passRate, 0);
  });

  test("les étapes fermées ne sont pas mesurées, et l'historique d'un autre pipeline est ignoré", () => {
    const stats = computePipelineStats(pipeline, [deal("x", ["autre", 0], ["a", 1])], NOW);
    assert.deepEqual(stats.stages.map((s) => s.stageId), ["a", "b", "c"]);
    assert.equal(stats.stages[0].reached, 1);
  });
});

describe("slowStage", () => {
  const stats = [computePipelineStats(pipeline, [2, 4, 6, 8, 10].map((d, i) => deal(`d${i}`, ["a", 0], ["b", d])), NOW)];
  const at = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString();

  test("au-delà d'une fois et demie la médiane, le deal traîne", () => {
    assert.deepEqual(slowStage(stats, { pipelineId: "p", stageId: "a", stageEnteredAt: at(10), closed: false }, NOW), {
      days: 10,
      medianDays: 6,
      samples: 5,
      label: "Découverte",
    });
    assert.equal(slowStage(stats, { pipelineId: "p", stageId: "a", stageEnteredAt: at(9), closed: false }, NOW), null);
  });

  test("rien sans médiane connue, sans date d'entrée, ou sur un deal fermé", () => {
    assert.equal(slowStage(stats, { pipelineId: "p", stageId: "b", stageEnteredAt: at(90), closed: false }, NOW), null);
    assert.equal(slowStage(stats, { pipelineId: "p", stageId: "a", stageEnteredAt: null, closed: false }, NOW), null);
    assert.equal(slowStage(stats, { pipelineId: "p", stageId: "a", stageEnteredAt: at(90), closed: true }, NOW), null);
    assert.equal(slowStage(null, { pipelineId: "p", stageId: "a", stageEnteredAt: at(90), closed: false }, NOW), null);
  });
});

describe("vue manager avec le parcours mesuré", () => {
  const stats = [computePipelineStats(pipeline, [2, 4, 6, 8, 10].map((d, i) => deal(`d${i}`, ["a", 0], ["b", d])), NOW)];
  const hubspot = {
    id: "hs",
    name: null,
    pipeline: "Ventes",
    stage: "Découverte",
    stageIndex: 1,
    stageCount: 5,
    closed: false,
    amount: null,
    closeDate: null,
    nextStep: null,
    url: null,
    pipelineId: "p",
    stageId: "a",
    stageEnteredAt: new Date(NOW - 20 * 86400000).toISOString(),
  };
  const row: BoardFicheRow = {
    dealId: "d",
    dealName: "Deal",
    hubspot,
    callId: "c",
    callAt: new Date(NOW - 2 * 86400000).toISOString(),
    callTitle: null,
    ownerId: "u",
    generatedAt: new Date(NOW - 2 * 86400000).toISOString(),
    alerts: [],
  };

  test("un deal qui traîne à son étape remonte dans la file, avec la durée habituelle", () => {
    const [d] = buildBoard([row], [], NOW, stats);
    assert.equal(d.alerts[0].rule, "etape_longue");
    assert.match(d.alerts[0].text, /depuis 20 jours ; un deal y reste 6 jours d'habitude/);
    assert.ok(d.intervention);
    // Sans le parcours mesuré, rien.
    assert.equal(buildBoard([row], [], NOW).at(0)!.alerts.length, 0);
  });

  test("le bandeau montre toutes les étapes ouvertes du pipeline, avec durée et taux", () => {
    const columns = buildStages(buildBoard([row], [], NOW, stats), stats);
    assert.deepEqual(columns.map((c) => [c.label, c.count]), [["Découverte", 1], ["Proposition", 0], ["Négociation", 0]]);
    assert.equal(columns[0].medianDays, 6);
    assert.equal(columns[0].passRate, 1);
  });

  test("l'étape qui traîne n'est pas un point de méthode du commercial", () => {
    const deals = buildBoard([row, { ...row, dealId: "e", callId: "c2" }], [], NOW, stats);
    assert.equal(buildTeam(deals, ["u"])[0].recurring, null);
  });
});
