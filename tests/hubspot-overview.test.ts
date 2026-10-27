import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildFieldPlans, suggestProperty } from "../lib/hubspot-overview";

// Verrouille la détection des propriétés HubSpot : une suggestion n'est
// proposée que si rien n'est choisi, et jamais deux fois la même propriété.

const PROPS = [
  { name: "description", label: "Deal Description" },
  { name: "hs_next_step", label: "Next step" },
  { name: "meddic_economic_buyer", label: "Economic Buyer" },
  { name: "budget_annuel", label: "Budget annuel" },
  { name: "decision_criteria", label: "Critères de décision" },
];

describe("hubspot-overview", () => {
  test("reconnaît les propriétés MEDDIC, en français comme en anglais", () => {
    assert.equal(suggestProperty("decideur", PROPS)?.name, "meddic_economic_buyer");
    assert.equal(suggestProperty("budget", PROPS)?.name, "budget_annuel");
    assert.equal(suggestProperty("criteres", PROPS)?.name, "decision_criteria");
    assert.equal(suggestProperty("champion", PROPS), null);
  });

  test("une information reliée n'a pas de suggestion, une propriété prise n'est pas resuggérée", () => {
    const plans = buildFieldPlans({ prochaines_etapes: "hs_next_step", budget: "description" }, PROPS);
    const budget = plans.find((p) => p.key === "budget");
    assert.equal(budget?.property?.name, "description");
    assert.equal(budget?.suggestion, null);
    assert.ok(!plans.some((p) => p.suggestion?.name === "description" || p.suggestion?.name === "hs_next_step"));
    assert.equal(plans.find((p) => p.key === "decideur")?.suggestion?.name, "meddic_economic_buyer");
  });
});
