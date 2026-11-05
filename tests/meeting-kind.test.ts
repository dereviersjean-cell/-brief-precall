import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nonCommercialMatch, resolveNonCommercialConfig } from "../lib/meeting-kind";

// Verrouille le repérage des rendez-vous non commerciaux (réponse de Jean à
// C1, 05/11/2026) : ce qui le déclenche, et surtout ce qui ne doit pas.

const defaults = resolveNonCommercialConfig(null);

describe("nonCommercialMatch", () => {
  test("repère un entretien, une étude de cas, un point interne", () => {
    assert.equal(nonCommercialMatch("Entretien — Camille Durand", defaults), "entretien");
    assert.equal(nonCommercialMatch("Case study : Martin x Oliverlist", defaults), "case study");
    assert.equal(nonCommercialMatch("Point interne pipeline", defaults), "point interne");
    assert.equal(nonCommercialMatch("Luc / Jean Weekly", defaults), "weekly");
  });

  test("sans majuscules ni accents", () => {
    assert.equal(nonCommercialMatch("ENTRETIEN candidat", defaults), "entretien");
    assert.equal(nonCommercialMatch("Rétro sprint", defaults), "rétro");
    assert.equal(nonCommercialMatch("retro du mois", defaults), "rétro");
  });

  test("mots entiers seulement", () => {
    assert.equal(nonCommercialMatch("Rétroplanning projet Sarawak", defaults), null);
    assert.equal(nonCommercialMatch("Formations Dupont — démo", defaults), null);
  });

  test("un vrai rendez-vous commercial passe", () => {
    assert.equal(nonCommercialMatch("CDA Jobs x Oliverlist — R2", defaults), null);
    assert.equal(nonCommercialMatch("Démo Brief", defaults), null);
    assert.equal(nonCommercialMatch("", defaults), null);
    assert.equal(nonCommercialMatch(null, defaults), null);
  });

  test("détection éteinte, liste remplacée", () => {
    assert.equal(nonCommercialMatch("Entretien", resolveNonCommercialConfig({ enabled: false })), null);
    const custom = resolveNonCommercialConfig({ keywords: ["perso"] });
    assert.equal(nonCommercialMatch("Entretien", custom), null);
    assert.equal(nonCommercialMatch("RDV perso", custom), "perso");
  });
});
