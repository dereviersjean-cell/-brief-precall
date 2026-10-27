import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { coerceDealRules, DEFAULT_RULES, METHODS, missingForStage, qualificationFields } from "../lib/deal-rules";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";
import { buildBoard, type BoardFicheRow } from "../lib/deal-board";

// Verrouille les règles des deals réglées par le manager : une valeur mal
// formée ne doit jamais casser une page, et les critères de passage doivent
// suivre la méthode choisie.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const item = (text: string) => ({ text, verbatim: null, startMs: null });

describe("coerceDealRules", () => {
  test("rien ou n'importe quoi : les règles par défaut", () => {
    assert.deepEqual(coerceDealRules(null), DEFAULT_RULES);
    assert.deepEqual(coerceDealRules("x"), DEFAULT_RULES);
  });

  test("valeurs bornées, méthode et champs inconnus écartés", () => {
    const r = coerceDealRules({ method: "spin", inactivityDays: 1000, slowStageFactor: 0.2, stageRequirements: { 1: ["douleur", "inconnu"], 9: ["budget"] } });
    assert.equal(r.method, "socle");
    assert.equal(r.inactivityDays, 90);
    assert.equal(r.slowStageFactor, 1);
    assert.deepEqual(r.stageRequirements, { 1: ["douleur"] });
  });
});

describe("missingForStage", () => {
  test("cumulatif : à l'étape 2, ce que demandent les étapes 1 et 2", () => {
    assert.deepEqual(missingForStage(DEFAULT_RULES, 2, new Set(["douleur"])).sort(), ["decideur", "impact"]);
    assert.deepEqual(missingForStage(DEFAULT_RULES, 1, new Set(["douleur"])), []);
    assert.deepEqual(missingForStage(DEFAULT_RULES, null, new Set()), []);
  });

  test("limité aux champs de la méthode : BANT ne demande ni impact ni critères", () => {
    const bant = coerceDealRules({ ...DEFAULT_RULES, method: "bant" });
    assert.deepEqual(qualificationFields(bant), METHODS.bant.fields);
    assert.deepEqual(missingForStage(bant, 3, new Set(["douleur", "decideur"])), []);
  });
});

describe("règles appliquées", () => {
  const fiche = (over: Partial<ProgressFiche>): ProgressFiche => ({
    dealId: "d",
    dealName: "Deal",
    hubspot: null,
    callId: "c",
    callAt: daysAgo(2),
    callTitle: null,
    fields: {},
    alerts: [],
    ...over,
  });

  test("seuil d'inactivité de l'organisation", () => {
    const rules = coerceDealRules({ inactivityDays: 7 });
    assert.equal(buildDealProgress([fiche({ callAt: daysAgo(8), fields: { douleur: [item("d")] } })], NOW, rules)[0].focus.status, "relancer");
    assert.notEqual(buildDealProgress([fiche({ callAt: daysAgo(8), fields: { douleur: [item("d")] } })], NOW)[0].focus.status, "relancer");
  });

  test("critère de passage manquant : à traiter, avec ce qu'il faut obtenir", () => {
    const [d] = buildDealProgress([fiche({ callId: "a", callAt: daysAgo(9) }), fiche({ callId: "b", fields: { douleur: [item("d")], prochaines_etapes: [{ ...item("Démo"), date: "2026-11-03" }] } })], NOW);
    assert.equal(d.focus.status, "traiter");
    assert.match(d.focus.action, /^Obtenir : /);
    assert.deepEqual(d.missingForStage.sort(), ["Décideur économique", "Impact chiffré / ROI attendu"]);
  });

  test("vue manager : l'alerte « critère de passage manquant »", () => {
    const row: BoardFicheRow = {
      dealId: "d",
      dealName: "Deal",
      hubspot: null,
      callId: "c",
      callAt: daysAgo(2),
      callTitle: null,
      ownerId: "u",
      generatedAt: daysAgo(2),
      alerts: [],
      knownKeys: [],
    };
    const [deal] = buildBoard([row], [], NOW);
    assert.equal(deal.alerts[0].rule, "critere_passage");
    assert.match(deal.alerts[0].text, /douleur identifiée/);
    // Sans les champs connus, aucun critère n'est évalué.
    assert.equal(buildBoard([{ ...row, knownKeys: undefined }], [], NOW)[0].alerts.length, 0);
  });
});
