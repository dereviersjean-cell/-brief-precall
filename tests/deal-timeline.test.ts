import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealTimeline, type TimelineFiche } from "../lib/deal-timeline";
import { DEFAULT_RULES } from "../lib/deal-rules";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille le fil d'un deal : l'écart entre deux calls, ce que chaque call
// a obtenu pour la première fois, et la grille information × call.

const item = (text: string, level?: "confirme" | "evoque", date?: string): DealMemoryItem => ({
  text,
  verbatim: text,
  startMs: null,
  ...(level ? { level } : {}),
  ...(date ? { date } : {}),
});

const fiche = (callId: string, callAt: string, fields: TimelineFiche["fields"]): TimelineFiche => ({
  callId,
  callAt,
  callTitle: null,
  ownerId: "u1",
  fields,
  alerts: [],
});

describe("deal-timeline", () => {
  const fiches = [
    fiche("c1", "2026-04-21T13:30:00Z", {
      douleur: [item("prospection", "confirme")],
      budget: [item("pas chiffré", "evoque")],
    }),
    fiche("c2", "2026-05-19T09:00:00Z", {
      budget: [item("1 500 €/mois", "confirme")],
      prochaines_etapes: [item("Envoyer un récap", undefined, "2026-05-28")],
    }),
  ];

  test("écart en jours, informations obtenues pour la première fois, engagements", () => {
    const { calls, spanDays } = buildDealTimeline(fiches, DEFAULT_RULES, {
      c2: { durationSeconds: 1992, summary: " Démo ", score: 2 },
    });
    assert.equal(calls[0].gapDays, null);
    assert.equal(calls[1].gapDays, 28);
    assert.equal(spanDays, 28);
    assert.deepEqual(calls[0].obtained, ["Douleur identifiée"]);
    assert.deepEqual(calls[1].obtained, ["Budget"]);
    assert.deepEqual(calls[1].commitments, [{ text: "Envoyer un récap", date: "2026-05-28" }]);
    assert.equal(calls[1].durationMinutes, 33);
    assert.equal(calls[1].summary, "Démo");
    assert.equal(calls[0].score, null);
  });

  test("la grille suit chaque information d'un call à l'autre", () => {
    const { grid } = buildDealTimeline(fiches, DEFAULT_RULES);
    const row = (key: string) => grid.find((r) => r.key === key)?.cells;
    assert.deepEqual(row("douleur"), ["confirme_ici", "acquis"]);
    assert.deepEqual(row("budget"), ["evoque", "confirme_ici"]);
    assert.deepEqual(row("decideur"), [null, null]);
  });

  test("au R2, le budget reporté du R1 est noté obtenu", () => {
    const { calls } = buildDealTimeline(fiches, DEFAULT_RULES);
    const budget = calls[1].objectives.find((o) => o.key === "budget");
    assert.equal(budget?.status, "obtenu");
    assert.equal(budget?.carried, true);
  });
});
