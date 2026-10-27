import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mergeKnown, nextCallPlan, objectivesMessage, reviewCallObjectives } from "../lib/call-objectives";
import { DEFAULT_RULES, coerceDealRules } from "../lib/deal-rules";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille les objectifs par rendez-vous : seul un « confirmé » est obtenu,
// ce qui manque est reporté au rendez-vous suivant, et le message au
// commercial dit ce qui est bon puis ce qu'il faut aller chercher.

const item = (text: string, level?: "confirme" | "evoque"): DealMemoryItem => ({ text, verbatim: text, startMs: null, ...(level ? { level } : {}) });

describe("call-objectives", () => {
  test("R1 : confirmé = obtenu, évoqué = à préciser, rien = pas abordé", () => {
    const rows = reviewCallObjectives({
      rank: 1,
      current: { douleur: [item("d", "confirme")], budget: [item("pas 18 000 €", "evoque")] },
      prior: {},
      rules: DEFAULT_RULES,
    });
    const status = Object.fromEntries(rows.map((r) => [r.key, r.status]));
    assert.deepEqual(status, { douleur: "obtenu", decideur: "pas_aborde", budget: "a_preciser", echeance: "pas_aborde" });
  });

  test("une fiche antérieure sans niveau compte comme obtenue", () => {
    const rows = reviewCallObjectives({ rank: 1, current: { budget: [item("15 k€")] }, prior: {}, rules: DEFAULT_RULES });
    assert.equal(rows.find((r) => r.key === "budget")?.status, "obtenu");
  });

  test("au R2, ce qui manquait au R1 est reporté, ce qui est confirmé disparaît", () => {
    const prior = { douleur: [item("d", "confirme")], budget: [item("flou", "evoque")] };
    const rows = reviewCallObjectives({ rank: 2, current: { budget: [item("15 k€", "confirme")] }, prior, rules: DEFAULT_RULES });
    assert.ok(!rows.some((r) => r.key === "douleur"));
    const budget = rows.find((r) => r.key === "budget");
    assert.equal(budget?.status, "obtenu");
    assert.equal(budget?.carried, true);
  });

  test("le plan du prochain call : à préciser d'abord, puis reporté, puis nouveau, avec une question", () => {
    const known = { douleur: [item("d", "confirme")], budget: [item("flou", "evoque")], impact: [item("50 démos", "confirme")] };
    const plan = nextCallPlan({ lastRank: 1, known, rules: DEFAULT_RULES });
    assert.equal(plan.rank, 2);
    assert.deepEqual(
      plan.items.map((i) => [i.key, i.reason]),
      [
        ["budget", "a_preciser"],
        ["decideur", "reporte"],
        ["echeance", "reporte"],
        ["criteres", "nouveau"],
        ["processus", "nouveau"],
        ["champion", "nouveau"],
      ]
    );
    assert.equal(plan.items[0].known?.text, "flou");
    for (const i of plan.items) assert.match(i.question, /^«.*»$/);
  });

  test("le message : ce qui est bon, ce qui est flou, ce qu'il faut aller chercher", () => {
    const rows = reviewCallObjectives({
      rank: 1,
      current: { douleur: [item("d", "confirme")], budget: [item("flou", "evoque")] },
      prior: {},
      rules: DEFAULT_RULES,
    });
    const plan = nextCallPlan({ lastRank: 1, known: mergeKnown([{ douleur: [item("d", "confirme")], budget: [item("flou", "evoque")] }]), rules: DEFAULT_RULES });
    const message = objectivesMessage(rows, plan, 1);
    assert.equal(message[0], "Au R1, tu as obtenu la douleur : c'est bon.");
    assert.equal(message[1], "Encore flou : le budget.");
    assert.equal(message[2], "Pas abordé : le décideur et l'échéance.");
    assert.match(message.at(-1) ?? "", /^Au R2, va chercher le budget, le décideur, l'échéance, /);
  });

  test("les objectifs se règlent par organisation et ne gardent que des champs connus", () => {
    const rules = coerceDealRules({ callObjectives: { 1: ["budget", "inconnu", "budget"], 9: ["douleur"] } });
    assert.deepEqual(rules.callObjectives, { 1: ["budget"] });
    assert.deepEqual(coerceDealRules({}).callObjectives, DEFAULT_RULES.callObjectives);
  });
});
