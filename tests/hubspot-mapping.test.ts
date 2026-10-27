import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { briefCandidates, coerceMapping, planWrites, serializeMapping, valueFor, type HubspotMapping, type PropertyDefinition } from "../lib/hubspot-mapping";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille le moteur d'écriture HubSpot : Brief n'écrit que ce qui est
// confirmé, au format de la propriété, sans écraser une saisie, et dit
// toujours pourquoi il n'écrit pas.

const item = (text: string, extra: Partial<DealMemoryItem & { callId: string }> = {}): DealMemoryItem & { callId: string } => ({
  text,
  verbatim: text,
  startMs: null,
  callId: "c2",
  ...extra,
});

const DEFS: Record<string, PropertyDefinition> = {
  hs_next_step: { type: "string", options: [], readOnly: false },
  budget_txt: { type: "string", options: [], readOnly: false },
  budget_num: { type: "number", options: [], readOnly: false },
  decision_date: { type: "date", options: [], readOnly: false },
  decideur_ok: { type: "enumeration", options: ["oui", "non"], readOnly: false },
  calc: { type: "string", options: [], readOnly: true },
};

function plan(mapping: HubspotMapping, memory: Parameters<typeof planWrites>[0]["memory"], current: Record<string, string | null> = {}, lastWritten: Record<string, string[]> = {}, dealClosed = false) {
  return planWrites({ mapping, memory, current, lastWritten, definitions: DEFS, dealClosed });
}

describe("hubspot-mapping", () => {
  test("l'ancien format (un nom par champ) devient une entrée texte, « remplir si vide » sauf la prochaine étape", () => {
    const m = coerceMapping({ douleur: "description" });
    assert.deepEqual(m.douleur, { property: "description", type: "string", mode: "fill_if_empty" });
    assert.equal(m.prochaines_etapes?.mode, "update_unless_edited");
    assert.equal(coerceMapping({ prochaines_etapes: "" }).prochaines_etapes, undefined);
    assert.deepEqual(serializeMapping({}), { prochaines_etapes: "" });
  });

  test("seule l'information confirmée part dans une propriété", () => {
    const entry = { property: "budget_txt", type: "string" as const, mode: "fill_if_empty" as const };
    assert.deepEqual(valueFor(entry, [item("pas 18 000 €", { level: "evoque" })]), { value: null, reason: "Encore floue" });
    assert.deepEqual(valueFor(entry, []), { value: null, reason: "Pas abordée" });
    assert.equal(valueFor(entry, [item("15 000 € sur l'année", { level: "confirme" })]).value, "15 000 € sur l'année");
  });

  test("nombre, date et liste : jamais autre chose que le format de la propriété", () => {
    assert.equal(valueFor({ property: "budget_num", type: "number", mode: "fill_if_empty" }, [item("15 k€", { level: "confirme", amount: 15000 })]).value, "15000");
    assert.equal(valueFor({ property: "budget_num", type: "number", mode: "fill_if_empty" }, [item("entre 10 et 20 k€", { level: "confirme", amount: null })]).reason, "Pas de montant précis");
    assert.equal(valueFor({ property: "decision_date", type: "date", mode: "fill_if_empty" }, [item("décision le 15 novembre", { level: "confirme", date: "2026-11-15" })]).value, "2026-11-15");
    const list = { property: "decideur_ok", type: "enumeration" as const, mode: "fill_if_empty" as const, options: { confirme: "oui" } };
    assert.equal(valueFor(list, [item("Joseph, CEO, signe", { level: "confirme" })]).value, "oui");
    assert.equal(valueFor(list, [item("il faudra en parler", { level: "evoque" })]).value, null);
  });

  test("remplir si vide : n'écrase jamais une valeur déjà là", () => {
    const mapping: HubspotMapping = { budget: { property: "budget_txt", type: "string", mode: "fill_if_empty" } };
    const memory = { budget: [item("15 000 €", { level: "confirme" })] };
    assert.equal(plan(mapping, memory, { budget_txt: "" })[0].action, "write");
    const skipped = plan(mapping, memory, { budget_txt: "20 000 € (saisi par Katell)" })[0];
    assert.deepEqual([skipped.action, skipped.reason], ["skip", "Déjà remplie"]);
  });

  test("mise à jour sauf modification à la main : remplace ce que Brief avait écrit, pas une saisie", () => {
    const mapping: HubspotMapping = { prochaines_etapes: { property: "hs_next_step", type: "string", mode: "update_unless_edited" } };
    const memory = { prochaines_etapes: [item("Démo lundi", { level: "confirme" })] };
    assert.equal(plan(mapping, memory, { hs_next_step: "Rappel mardi" }, { hs_next_step: ["Rappel mardi"] })[0].action, "write");
    assert.equal(plan(mapping, memory, { hs_next_step: "Relancer en janvier" }, { hs_next_step: ["Rappel mardi"] })[0].reason, "Modifiée à la main dans HubSpot");
    assert.equal(plan(mapping, memory, { hs_next_step: "Relancer en janvier" }, {})[0].reason, "Modifiée à la main dans HubSpot");
  });

  test("une prochaine étape écrite par Brief avant le journal est reconnue comme la sienne", () => {
    const mapping: HubspotMapping = { prochaines_etapes: { property: "hs_next_step", type: "string", mode: "update_unless_edited" } };
    const memory = { prochaines_etapes: [item("Démo lundi", { level: "confirme" }), item("Rappel mardi", { callId: "c1" })] };
    const candidates = briefCandidates(mapping, memory);
    assert.deepEqual(candidates.hs_next_step, ["Démo lundi", "Rappel mardi"]);
    assert.equal(plan(mapping, memory, { hs_next_step: "Rappel mardi" }, candidates)[0].action, "write");
  });

  test("propriété disparue, en lecture seule, type changé, option inconnue, deal clos : rien n'est écrit", () => {
    const memory = { budget: [item("15 000 €", { level: "confirme", amount: 15000 })], decideur: [item("Joseph signe", { level: "confirme" })] };
    const reason = (mapping: HubspotMapping, closed = false) => plan(mapping, memory, {}, {}, closed)[0].reason;
    assert.equal(reason({ budget: { property: "absente", type: "string", mode: "fill_if_empty" } }), "Propriété introuvable dans HubSpot");
    assert.equal(reason({ budget: { property: "calc", type: "string", mode: "fill_if_empty" } }), "Propriété en lecture seule");
    assert.equal(reason({ budget: { property: "budget_num", type: "string", mode: "fill_if_empty" } }), "Le type de la propriété a changé depuis le réglage");
    assert.equal(reason({ decideur: { property: "decideur_ok", type: "enumeration", mode: "fill_if_empty", options: { confirme: "peut-être" } } }), "Option inexistante dans HubSpot");
    assert.equal(reason({ budget: { property: "budget_txt", type: "string", mode: "fill_if_empty" } }, true), "Deal clos");
  });
});
