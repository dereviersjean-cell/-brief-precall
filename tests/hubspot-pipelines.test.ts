import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { wonStagesOf } from "../lib/crm/hubspot-pipelines";

// « Gagné » n'est pas une étape nommée `closedwon` : ce nom n'existe que dans
// le pipeline par défaut d'un portail neuf. Le filtre qui s'y fiait rendait
// zéro deal sur le portail d'Oliverlist, dont l'étape gagnée s'appelle
// « Signé ». Les formes ci-dessous sont celles que HubSpot rend vraiment —
// `isClosed` et `probability` arrivent en chaînes.

describe("wonStagesOf", () => {
  test("retient une étape fermée à 100 %, quel que soit son libellé", () => {
    assert.deepEqual(
      wonStagesOf({
        stages: [
          { id: "5149290701", label: "Signé", metadata: { isClosed: "true", probability: "1.0" } },
          { id: "123", label: "Proposition envoyée", metadata: { isClosed: "false", probability: "0.5" } },
        ],
      }),
      [{ id: "5149290701", label: "Signé" }]
    );
  });

  test("écarte une étape fermée mais perdue", () => {
    assert.deepEqual(
      wonStagesOf({
        stages: [{ id: "9", label: "Perdu", metadata: { isClosed: "true", probability: "0.0" } }],
      }),
      []
    );
  });

  test("accepte probability en nombre comme en chaîne", () => {
    const stages = [
      { id: "a", label: "A", metadata: { isClosed: "true", probability: 1 } },
      { id: "b", label: "B", metadata: { isClosed: "true", probability: "1" } },
    ];
    assert.deepEqual(wonStagesOf({ stages }).map((s) => s.id), ["a", "b"]);
  });

  test("un pipeline sans étape gagnée, ou sans étapes du tout, rend une liste vide", () => {
    assert.deepEqual(wonStagesOf({ stages: [] }), []);
    assert.deepEqual(wonStagesOf({}), []);
    assert.deepEqual(wonStagesOf({ stages: "pas une liste" as unknown as [] }), []);
  });

  test("tolère une étape sans libellé : l'identifiant en tient lieu", () => {
    assert.deepEqual(wonStagesOf({ stages: [{ id: "77", metadata: { isClosed: "true", probability: "1.0" } }] }), [
      { id: "77", label: "77" },
    ]);
  });

  test("le pipeline « Suivi » d'Oliverlist : sept étapes comptées gagnées, d'où le choix du pipeline", () => {
    // Relevé sur le portail réel le 24/11/2026. Ces étapes sont des états de
    // vie de compte, pas des ventes : importer « Deleted » ou « Paiements
    // refusés » comme référence client serait pire que n'importer rien.
    const suivi = {
      stages: [
        { id: "294191034", label: "En validation", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "98576628", label: "En préparation", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "98576629", label: "Active", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "98576631", label: "Stand-by", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "306043893", label: "Paiements refusés", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "306043894", label: "Recouvrement", metadata: { isClosed: "true", probability: "1.0" } },
        { id: "98857156", label: "Deleted", metadata: { isClosed: "true", probability: "1.0" } },
      ],
    };
    assert.equal(wonStagesOf(suivi).length, 7);
  });
});
