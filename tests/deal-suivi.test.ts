import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { suiviLevel, suiviReason } from "../lib/deal-suivi";
import type { DealProgress } from "../lib/deal-progress";

// Verrouille le tri de « Suivi des deals » : ce qui demande au manager
// d'intervenir, ce qui se surveille, ce qui avance sans lui.

const deal = (over: Partial<DealProgress>): DealProgress =>
  ({
    verdict: "progres",
    nextStep: { date: "2026-11-10", text: "Call de suivi", status: "a_jour" },
    focus: { status: "bonne_voie", action: "", detail: null },
    ...over,
  }) as DealProgress;

describe("deal-suivi", () => {
  test("un deal qui recule demande d'intervenir", () => {
    assert.equal(suiviLevel(deal({ verdict: "recul" })), "intervenir");
  });

  test("une suite datée passée sans call demande d'intervenir, et se dit telle quelle", () => {
    const d = deal({ verdict: "arret", nextStep: { date: "2026-07-15", text: "Envoyer le récap", status: "en_retard" } });
    assert.equal(suiviLevel(d), "intervenir");
    assert.equal(suiviReason(d, "autre"), "Engagement en retard : Envoyer le récap (prévu le 15 juillet)");
  });

  test("à relancer se surveille, en bonne voie avance seul", () => {
    assert.equal(suiviLevel(deal({ verdict: "arret", focus: { status: "relancer", action: "", detail: null } } as Partial<DealProgress>)), "surveiller");
    assert.equal(suiviLevel(deal({})), "seul");
  });

  test("hors engagement en retard, la raison est celle du conseil au manager", () => {
    assert.equal(suiviReason(deal({ verdict: "recul" }), "Le décideur n'a jamais été rencontré."), "Le décideur n'a jamais été rencontré.");
  });
});
