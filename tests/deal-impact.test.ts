import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildAlertImpact } from "../lib/deal-impact";

// Verrouille la mesure de l'effet des alertes : un deal vu est « remis en
// mouvement » seulement si un nouveau call suit dans la fenêtre ; trop
// récent, il n'est compté ni comme réussite ni comme échec.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

describe("buildAlertImpact", () => {
  test("remis en mouvement, raté, en attente ; « Plus tard » ne compte pas", () => {
    const impact = buildAlertImpact(
      [
        { dealId: "a", status: "seen", alertRules: ["decideur_absent"], at: daysAgo(30) },
        { dealId: "b", status: "seen", alertRules: ["decideur_absent", "inactivite"], at: daysAgo(30) },
        { dealId: "c", status: "seen", alertRules: [], at: daysAgo(3) },
        { dealId: "d", status: "later", alertRules: [], at: daysAgo(30) },
      ],
      { a: [daysAgo(40), daysAgo(25)], b: [daysAgo(40), daysAgo(5)] },
      NOW,
      14
    );
    assert.equal(impact.seen, 3);
    assert.equal(impact.moved, 1);
    assert.equal(impact.pending, 1);
    assert.equal(impact.rate, 0.5);
    assert.equal(impact.avgDays, 5);
    assert.deepEqual(impact.byRule[0], { rule: "decideur_absent", label: "Décideur absent", seen: 2, moved: 1 });
  });

  test("rien de vu : rien à mesurer", () => {
    const impact = buildAlertImpact([], {}, NOW, 14);
    assert.equal(impact.seen, 0);
    assert.equal(impact.rate, null);
  });
});
