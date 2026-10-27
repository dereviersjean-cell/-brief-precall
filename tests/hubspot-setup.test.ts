import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { entryFor, methodVerdict, proposeMappings, typeCompatible, yesOption, type DiagnosticProperty } from "../lib/hubspot-setup";

// Verrouille les propositions du setup HubSpot : une propriété du client n'est
// proposée que si son type convient, une liste seulement avec une option qui
// veut dire « obtenu », et sinon une propriété Brief.

const prop = (over: Partial<DiagnosticProperty>): DiagnosticProperty => ({
  name: "x",
  label: "X",
  type: "string",
  fieldType: "text",
  options: [],
  readOnly: false,
  custom: true,
  groupName: null,
  fillRate: 0.5,
  samples: ["exemple"],
  ...over,
});

describe("hubspot-setup", () => {
  test("types compatibles : un montant pour le budget, une date pour l'échéance", () => {
    assert.ok(typeCompatible("budget", "number"));
    assert.ok(!typeCompatible("douleur", "number"));
    assert.ok(typeCompatible("echeance", "date"));
    assert.ok(!typeCompatible("prochaines_etapes", "enumeration"));
  });

  test("un client MEDDIC : ses propriétés sont proposées, avec la raison", () => {
    const proposals = proposeMappings([
      prop({ name: "meddic_economic_buyer", label: "Economic Buyer", samples: ["Marc Dupont, DAF"] }),
      prop({ name: "budget_k", label: "Budget annuel", type: "number", samples: ["15000"] }),
      prop({ name: "hs_next_step", label: "Next step", custom: false }),
    ]);
    const decideur = proposals.find((p) => p.key === "decideur")!;
    assert.deepEqual(decideur.choice, { kind: "existing", property: "meddic_economic_buyer", type: "string", mode: "fill_if_empty" });
    assert.match(decideur.reason, /Marc Dupont, DAF/);
    assert.equal(proposals.find((p) => p.key === "budget")!.choice.kind, "existing");
    assert.deepEqual(proposals.find((p) => p.key === "prochaines_etapes")!.choice, {
      kind: "existing",
      property: "hs_next_step",
      type: "string",
      mode: "update_unless_edited",
    });
    assert.equal(proposals.find((p) => p.key === "champion")!.choice.kind, "create");
  });

  test("une propriété du mauvais type n'est pas proposée : propriété Brief", () => {
    const douleur = proposeMappings([prop({ name: "pain_score", label: "Pain score", type: "number" })]).find((p) => p.key === "douleur")!;
    assert.equal(douleur.choice.kind, "create");
    assert.match(douleur.reason, /pas le bon type/);
  });

  test("une liste : l'option « Oui » est retenue pour « obtenu », sinon propriété Brief", () => {
    const options = [
      { label: "Oui", value: "yes" },
      { label: "Non", value: "no" },
    ];
    assert.equal(yesOption({ type: "enumeration", options }), "yes");
    const withYes = proposeMappings([prop({ name: "dm_ok", label: "Décideur identifié", type: "enumeration", options })]).find((p) => p.key === "decideur")!;
    assert.deepEqual(withYes.choice, { kind: "existing", property: "dm_ok", type: "enumeration", mode: "fill_if_empty", options: { confirme: "yes" } });
    const withoutYes = proposeMappings([prop({ name: "dm_lvl", label: "Décideur", type: "enumeration", options: [{ label: "A", value: "a" }] })]).find((p) => p.key === "decideur")!;
    assert.equal(withoutYes.choice.kind, "create");
  });

  test("verdict et réglage enregistré", () => {
    assert.match(methodVerdict(proposeMappings([])), /^Aucune propriété de qualification/);
    assert.deepEqual(entryFor("budget", { kind: "create", mode: "fill_if_empty" }), { property: "brief_budget", type: "string", mode: "fill_if_empty" });
    assert.equal(entryFor("budget", { kind: "note" }), null);
  });
});
