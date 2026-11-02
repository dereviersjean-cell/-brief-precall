import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { coachingQuestions, interventionLevel, managerTitle, managerWhy, personAdvice, recurringWeakPoint, withDe } from "../lib/deal-coaching";
import { buildDealProgress, type DealProgress, type ProgressFiche } from "../lib/deal-progress";

// Verrouille le conseil au manager de l'onglet Équipe : le niveau
// d'intervention suit la tendance du deal, et ce qu'on propose de dire au
// commercial est une question entre guillemets, jamais une consigne au
// prospect.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const item = (text: string, date?: string | null) => ({ text, verbatim: null, startMs: null, ...(date !== undefined ? { date } : {}) });
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
const progress = (fiches: ProgressFiche[]): DealProgress => buildDealProgress(fiches, NOW)[0];

describe("deal-coaching", () => {
  test("un deal sans nouvelles se surveille, et la question porte sur la relance", () => {
    const d = progress([fiche({ dealName: "Velbrun", callAt: daysAgo(30), fields: { douleur: [item("d")] } })]);
    assert.equal(d.focus.status, "relancer");
    assert.equal(interventionLevel(d), "surveiller");
    assert.match(managerTitle(d, "Hubert de la Lance"), /^Garder un œil : relancer/);
    assert.match(managerWhy(d), /le deal refroidit\.$/);
    assert.match(coachingQuestions(d)[0], /^« Où en es-tu avec Velbrun \?/);
  });

  test("un deal qui recule demande d'intervenir, avec le prénom du commercial", () => {
    const d = { ...progress([fiche({ dealName: "Atelier Brunet" })]), verdict: "recul" as const };
    assert.equal(interventionLevel(d), "oui");
    assert.equal(managerTitle(d, "Jean de Reviers"), "Parler d'Atelier Brunet avec Jean");
  });

  test("toutes les questions sont entre guillemets, trois au plus, sans doublon", () => {
    const d = progress([
      fiche({
        callAt: daysAgo(30),
        alerts: [{ rule: "objection_recurrente", text: "Le prix revient", verbatim: "C'est trop cher", startMs: null }],
      }),
    ]);
    const q = coachingQuestions(d);
    assert.ok(q.length > 0 && q.length <= 3);
    assert.equal(new Set(q).size, q.length);
    for (const line of q) assert.match(line, /^«.*»$/);
  });

  test("le point récurrent n'existe qu'à partir de deux deals", () => {
    const a = { alerts: ["Interlocuteur à faire entrer"] } as DealProgress;
    const b = { alerts: ["Interlocuteur à faire entrer", "Concurrent évoqué"] } as DealProgress;
    assert.equal(recurringWeakPoint([a]), null);
    assert.deepEqual(recurringWeakPoint([a, b]), { label: "Interlocuteur à faire entrer", count: 2 });
  });

  test("le conseil sur une personne regroupe ses relances en une seule question", () => {
    const deals = ["Velbrun", "Chalet des Prats"].map((name, i) =>
      progress([fiche({ dealId: `d${i}`, dealName: name, callId: `c${i}`, callAt: daysAgo(30), fields: { douleur: [item("d")] } })])
    );
    const advice = personAdvice("Hubert de la Lance", deals);
    assert.equal(advice.title, "Faire le point avec Hubert sur 2 deals");
    assert.equal(advice.questions.filter((q) => q.includes("Velbrun")).length, 1);
    assert.match(advice.questions[0], /Velbrun, Chalet des Prats/);
  });

  test("élision devant une voyelle", () => {
    assert.equal(withDe("Atelier"), "d'Atelier");
    assert.equal(withDe("Velbrun"), "de Velbrun");
  });
});
