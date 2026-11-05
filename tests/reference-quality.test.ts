import { test } from "node:test";
import assert from "node:assert/strict";
import { hasRealValue, isCitableReference } from "../lib/reference-quality";

// Les valeurs de remplissage relevées dans la base d'Oliverlist (05/11/2026)
// ne rendent pas une référence citable.
test("valeurs vides ou de remplissage", () => {
  for (const v of [null, undefined, "", "  ", "Unknown", "unknown", "Non spécifié", "Non specifie", "Non renseigné", "N/A", "-", "—", "Inconnu."]) {
    assert.equal(hasRealValue(v), false, String(v));
  }
});

test("un vrai résultat", () => {
  assert.equal(isCitableReference({ result: "Pipeline qualifié x2.5 en 3 mois" }), true);
  assert.equal(isCitableReference({ result: "Unknown" }), false);
});
