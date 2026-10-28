import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildPersonPrompt, parsePersonAdvice } from "../lib/person-advice-ai";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";

// Verrouille le conseil Haiku sur un commercial : une réponse à trous est
// écartée (le bandeau garde les règles fixes), et le prompt porte les faits
// de chaque deal.

const NOW = Date.parse("2026-10-28T10:00:00Z");
const fiche = (dealId: string, dealName: string, daysAgo: number): ProgressFiche => ({
  dealId,
  dealName,
  hubspot: null,
  callId: `c-${dealId}`,
  callAt: new Date(NOW - daysAgo * 86400000).toISOString(),
  callTitle: null,
  fields: { douleur: [{ text: "paiement", verbatim: null, startMs: null }] },
  alerts: [{ rule: "decideur_absent", text: "Pas de décideur", verbatim: null, startMs: null }],
});

describe("person-advice-ai", () => {
  test("la réponse est lue, les questions mises entre « »", () => {
    const raw = JSON.stringify({
      title: "Travailler avec Guislain le décideur",
      why: "Sarawak et Euronext n'ont aucun décideur.",
      questions: ["Qui tranche chez Sarawak ?"],
    });
    const advice = parsePersonAdvice(raw, "claude-haiku-5-5", "t");
    assert.deepEqual(advice?.questions, ["« Qui tranche chez Sarawak ? »"]);
  });

  test("une réponse à trous est écartée", () => {
    assert.equal(parsePersonAdvice(JSON.stringify({ title: "x", why: "y", questions: [] }), "m", "t"), null);
    assert.equal(parsePersonAdvice("non", "m", "t"), null);
  });

  test("le prompt porte la date du jour et chaque deal", () => {
    const deals = buildDealProgress([fiche("a", "Sarawak France", 113), fiche("b", "Euronext", 2)], NOW);
    const prompt = buildPersonPrompt({ name: "Guislain", deals, week: 0, today: "2026-10-28" });
    assert.match(prompt, /Date du jour : 2026-10-28/);
    assert.match(prompt, /## Sarawak France\n- 1 call, à relancer/);
    assert.match(prompt, /dernier call il y a 113 jours/);
    assert.match(prompt, /## Euronext/);
  });
});
