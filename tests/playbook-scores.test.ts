import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeWeightedGlobalScore } from "../lib/playbook-scores";

// Le score global d'un call est calculé par le code, plus par le modèle
// (29/09/2026) : il faut qu'il suive exactement les poids du playbook.
describe("computeWeightedGlobalScore", () => {
  const snapshot = {
    dimensions: [
      { key: "decouverte", weight: 2 },
      { key: "closing", weight: 1 },
    ],
  };

  test("moyenne pondérée arrondie au dixième", () => {
    const scores = { decouverte: { score: 4, description: "" }, closing: { score: 1, description: "" } };
    assert.equal(computeWeightedGlobalScore(scores, snapshot), 3);
  });

  test("ignore les dimensions absentes de la réponse", () => {
    assert.equal(computeWeightedGlobalScore({ closing: { score: 2.5, description: "" } }, snapshot), 2.5);
  });

  test("ignore le global_score renvoyé par le modèle", () => {
    const scores = { global_score: 5, decouverte: { score: 3, description: "" }, closing: { score: 3, description: "" } };
    assert.equal(computeWeightedGlobalScore(scores, snapshot), 3);
  });

  test("null quand aucune note ne correspond à la grille", () => {
    assert.equal(computeWeightedGlobalScore({ autre: { score: 4, description: "" } }, snapshot), null);
    assert.equal(computeWeightedGlobalScore(null, snapshot), null);
  });
});
