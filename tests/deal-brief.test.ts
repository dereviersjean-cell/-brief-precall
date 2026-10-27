import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealBriefContext, formatDealBriefForPrompt } from "../lib/deal-brief";
import type { ProgressFiche } from "../lib/deal-progress";

// Verrouille le brief d'une suite de deal : le rang du call, la checklist
// cumulée sur tous les calls précédents, ce qu'il reste à aller chercher.

const item = (text: string, date?: string | null) => ({ text, verbatim: null, startMs: null, ...(date !== undefined ? { date } : {}) });
const fiche = (over: Partial<ProgressFiche>): ProgressFiche => ({
  dealId: "d",
  dealName: "Peatch AI",
  hubspot: null,
  callId: "c",
  callAt: "2026-10-20T10:00:00Z",
  callTitle: null,
  fields: {},
  alerts: [],
  ...over,
});

describe("buildDealBriefContext", () => {
  const ctx = buildDealBriefContext(
    [
      fiche({ callId: "c2", callAt: "2026-10-13T10:00:00Z", fields: { budget: [item("10 k€")], prochaines_etapes: [item("Envoyer la proposition", "2026-11-03")] }, alerts: [{ rule: "preuve_sociale", text: "Veut un cas client", verbatim: null, startMs: null }] }),
      fiche({ callId: "c1", callAt: "2026-10-01T10:00:00Z", fields: { douleur: [item("Pas assez de leads")] } }),
    ],
    [{ objection: "Trop cher", handlingQuality: "non_traitee" }, { objection: "Délai", handlingQuality: "bien_traitee" }]
  )!;

  test("le call qui arrive est le troisième, le dernier est celui du 13 octobre", () => {
    assert.equal(ctx.callNumber, 3);
    assert.equal(ctx.lastCall.at, "2026-10-13T10:00:00Z");
  });

  test("checklist cumulée : ce qu'ont validé tous les calls précédents", () => {
    const done = ctx.checklist.filter((c) => c.done).map((c) => c.label);
    assert.deepEqual(done, ["Douleur identifiée", "Budget"]);
    assert.equal(ctx.toFind.length, 6);
  });

  test("la dernière fois : engagements datés, points de vigilance avec l'action, objections mal traitées", () => {
    assert.deepEqual(ctx.engagements, [{ text: "Envoyer la proposition", date: "2026-11-03" }]);
    assert.equal(ctx.points[0].label, "Besoin de preuve sociale");
    assert.ok(ctx.points[0].action.length > 0);
    assert.deepEqual(ctx.objections, ["Trop cher"]);
  });

  test("le texte pour le modèle dit que ce n'est pas un premier rendez-vous", () => {
    const text = formatDealBriefForPrompt(ctx);
    assert.match(text, /call n°3/);
    assert.match(text, /Ce n'est PAS un premier rendez-vous/);
    assert.match(text, /Budget : 10 k€/);
  });

  test("aucune fiche : pas de suite", () => {
    assert.equal(buildDealBriefContext([], []), null);
  });
});
