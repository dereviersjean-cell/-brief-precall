import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mergeKnown, nextCallPlan, objectivesMessage, reviewCallObjectives } from "../lib/call-objectives";
import { DEFAULT_RULES, coerceDealRules } from "../lib/deal-rules";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille les objectifs par rendez-vous : seul un « confirmé » est obtenu,
// ce qui manque est reporté au rendez-vous suivant, et le message au
// commercial dit ce qui est bon puis ce qu'il faut aller chercher.

const item = (text: string, level?: "confirme" | "evoque"): DealMemoryItem => ({ text, verbatim: text, startMs: null, ...(level ? { level } : {}) });

// Depuis le 14/11/2026 les objectifs suivent l'étape commerciale. Par défaut :
// 1 Qualification (douleur, impact, décideur, échéance), 2 Évaluation
// (critères, budget, processus), 3 Proposition (allié chez le client).
describe("call-objectives", () => {
  test("étape 1 : confirmé = obtenu, évoqué = à préciser, rien = pas abordé", () => {
    const rows = reviewCallObjectives({
      rank: 1,
      current: { douleur: [item("d", "confirme")], echeance: [item("avant l'été", "evoque")] },
      prior: {},
      rules: DEFAULT_RULES,
    });
    const status = Object.fromEntries(rows.map((r) => [r.key, r.status]));
    assert.deepEqual(status, { douleur: "obtenu", impact: "pas_aborde", decideur: "pas_aborde", echeance: "a_preciser" });
  });

  test("une fiche antérieure sans niveau compte comme obtenue", () => {
    const rows = reviewCallObjectives({ rank: 1, current: { douleur: [item("d")] }, prior: {}, rules: DEFAULT_RULES });
    assert.equal(rows.find((r) => r.key === "douleur")?.status, "obtenu");
  });

  test("à l'étape 2, ce qui manquait à l'étape 1 est reporté, ce qui est confirmé disparaît", () => {
    const prior = { douleur: [item("d", "confirme")], decideur: [item("flou", "evoque")] };
    const rows = reviewCallObjectives({ rank: 2, level: 2, current: { decideur: [item("le DG", "confirme")] }, prior, rules: DEFAULT_RULES });
    assert.ok(!rows.some((r) => r.key === "douleur"));
    const decideur = rows.find((r) => r.key === "decideur");
    assert.equal(decideur?.status, "obtenu");
    assert.equal(decideur?.carried, true);
    assert.equal(rows.find((r) => r.key === "budget")?.carried, false);
  });

  test("l'étape compte, pas le numéro du rendez-vous : un R4 encore en première étape garde ses objectifs", () => {
    const rows = reviewCallObjectives({ rank: 4, level: 1, current: {}, prior: {}, rules: DEFAULT_RULES });
    assert.deepEqual(rows.map((r) => r.key), ["douleur", "impact", "decideur", "echeance"]);
  });

  test("le plan du prochain call : ce qui manque à l'étape en cours, à préciser d'abord", () => {
    const known = { douleur: [item("d", "confirme")], echeance: [item("flou", "evoque")] };
    const plan = nextCallPlan({ lastRank: 1, level: 1, known, rules: DEFAULT_RULES });
    assert.equal(plan.rank, 2);
    assert.deepEqual(
      plan.items.map((i) => [i.key, i.reason]),
      [
        ["echeance", "a_preciser"],
        ["impact", "nouveau"],
        ["decideur", "nouveau"],
      ]
    );
    assert.equal(plan.items[0].known?.text, "flou");
    for (const i of plan.items) assert.match(i.question, /^«.*»$/);
  });

  test("tout est obtenu à l'étape en cours : le plan vise l'étape suivante", () => {
    const known = Object.fromEntries(["douleur", "impact", "decideur", "echeance"].map((k) => [k, [item("ok", "confirme")]]));
    const plan = nextCallPlan({ lastRank: 1, level: 1, known, rules: DEFAULT_RULES });
    assert.deepEqual(plan.items.map((i) => i.key), ["criteres", "budget", "processus"]);
  });

  test("le message : ce qui est bon, ce qui est flou, ce qu'il faut aller chercher", () => {
    const current = { douleur: [item("d", "confirme")], echeance: [item("flou", "evoque")] };
    const rows = reviewCallObjectives({ rank: 1, current, prior: {}, rules: DEFAULT_RULES });
    const plan = nextCallPlan({ lastRank: 1, known: mergeKnown([current]), rules: DEFAULT_RULES });
    const message = objectivesMessage(rows, plan, 1);
    assert.equal(message[0], "Au R1, tu as obtenu la douleur : c'est bon.");
    assert.equal(message[1], "Encore flou : l'échéance.");
    assert.equal(message[2], "Pas abordé : l'impact chiffré et le décideur.");
    assert.match(message.at(-1) ?? "", /^Au R2, va chercher l'échéance, /);
  });

  test("les objectifs se règlent par organisation et ne gardent que des champs connus", () => {
    const rules = coerceDealRules({ stageRequirements: { 1: ["budget", "inconnu", "budget"], 9: ["douleur"] } });
    assert.deepEqual(rules.stageRequirements, { 1: ["budget"] });
    assert.deepEqual(coerceDealRules({}).stageRequirements, DEFAULT_RULES.stageRequirements);
  });
});
