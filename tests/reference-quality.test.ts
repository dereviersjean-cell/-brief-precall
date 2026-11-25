import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hasRealValue, isCitableReference, referenceDetail } from "../lib/reference-quality";

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

// Le détail libre donné au modèle (25/11/2026). Une référence importée d'un
// CRM n'a ni problème, ni solution, ni résultat — ces champs se saisissent à
// la main. Sans ce texte, le brief recevait « aucun détail en base » pour
// 1 451 clients signés, alors que l'import avait rapatrié la description de
// l'entreprise.
describe("referenceDetail", () => {
  test("rend le texte quand il dit quelque chose", () => {
    assert.equal(
      referenceDetail("Utelys conçoit des guest apps pour les hôtels. — Secteur : Hospitality"),
      "Utelys conçoit des guest apps pour les hôtels. — Secteur : Hospitality"
    );
  });

  test("écarte le vide et les « non renseigné » de la base", () => {
    assert.equal(referenceDetail(null), null);
    assert.equal(referenceDetail("   "), null);
    assert.equal(referenceDetail("Unknown"), null);
    assert.equal(referenceDetail("Non spécifié"), null);
  });

  test("écrase les blancs multiples d'un import de fichier", () => {
    assert.equal(referenceDetail("  deux\n\n  lignes  "), "deux lignes");
  });

  test("borne un texte trop long, sans couper un mot en deux", () => {
    const long = "mot ".repeat(200).trim();
    const out = referenceDetail(long) ?? "";
    assert.ok(out.length <= 401, `longueur ${out.length}`);
    assert.ok(out.endsWith("…"));
    assert.ok(!out.includes("mo…"));
  });

  test("un texte long d'un seul tenant est coupé net plutôt que rendu entier", () => {
    const out = referenceDetail("x".repeat(600)) ?? "";
    assert.equal(out.length, 401);
    assert.ok(out.endsWith("…"));
  });
});
