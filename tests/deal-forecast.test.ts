import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { forecastDeal, forecastPeriods, inPeriod, isWon, type ForecastPerson } from "../lib/deal-forecast";
import type { DealProgress } from "../lib/deal-progress";

// Verrouille la prévision de chiffre d'affaires : la probabilité de Brief ne
// dépasse jamais celle de HubSpot, le plafond le plus bas l'emporte, et un
// deal sans montant ou sans date ne compte pas.

const TODAY = "2026-11-10";
const deal = (over: Record<string, unknown> = {}, hs: Record<string, unknown> = {}): DealProgress =>
  ({
    id: "d1",
    name: "Deal",
    verdict: "progres",
    reasons: [],
    topAlert: null,
    nextStep: { date: "2026-11-20", text: "Démo", status: "a_jour" },
    checklist: [
      { key: "decideur", label: "Décideur", known: true, vague: false },
      { key: "budget", label: "Budget", known: true, vague: false },
    ],
    hubspot: { id: "hs", closed: false, amount: 10000, closeDate: "2026-11-25T00:00:00Z", probability: 0.8, stageId: "decisionmakerboughtin", ...hs },
    ...over,
  }) as unknown as DealProgress;

describe("forecastDeal", () => {
  test("les calls confirment : Brief reprend la probabilité HubSpot", () => {
    const f = forecastDeal(deal(), TODAY, "x")!;
    assert.equal(f.hubspotPct, 80);
    assert.equal(f.briefPct, 80);
    assert.equal(f.ask, "");
  });

  test("le plafond le plus bas l'emporte", () => {
    const d = deal({ nextStep: { date: "2026-11-01", text: "Démo", status: "en_retard" }, checklist: [{ key: "budget", label: "Budget", known: false, vague: false }] });
    const f = forecastDeal(d, TODAY, "Relancer")!;
    assert.equal(f.briefPct, 30);
    assert.match(f.why, /suite convenue/);
    assert.equal(f.ask, "Relancer");
  });

  test("Brief ne monte jamais au-dessus de HubSpot", () => {
    const d = deal({ checklist: [{ key: "budget", label: "Budget", known: false, vague: false }] }, { probability: 0.2 });
    assert.equal(forecastDeal(d, TODAY, "x")!.briefPct, 20);
  });

  test("clôture dépassée", () => {
    assert.equal(forecastDeal(deal({}, { closeDate: "2026-11-05" }), TODAY, "x")!.briefPct, 25);
    assert.equal(forecastDeal(deal({}, { closeDate: "2026-10-01" }), TODAY, "x")!.briefPct, 10);
  });

  test("sans montant, sans date, sans probabilité ou clos : pas compté", () => {
    assert.equal(forecastDeal(deal({}, { amount: null }), TODAY, "x"), null);
    assert.equal(forecastDeal(deal({}, { closeDate: null }), TODAY, "x"), null);
    assert.equal(forecastDeal(deal({}, { probability: undefined }), TODAY, "x"), null);
    assert.equal(forecastDeal(deal({}, { closed: true }), TODAY, "x"), null);
    assert.equal(forecastDeal(deal({ hubspot: null }), TODAY, "x"), null);
  });
});

describe("périodes", () => {
  test("mois et trimestre en cours", () => {
    const [m, q] = forecastPeriods(TODAY);
    assert.deepEqual([m.start, m.end, m.title], ["2026-11-01", "2026-11-30", "Prévision de novembre"]);
    assert.deepEqual([q.start, q.end, q.title], ["2026-10-01", "2026-12-31", "Prévision du 4e trimestre"]);
    assert.equal(forecastPeriods("2026-04-02")[0].title, "Prévision d'avril");
    assert.equal(forecastPeriods("2028-02-10")[0].end, "2028-02-29");
  });

  test("totaux d'une personne sur la période", () => {
    const base = { id: "d", name: "D", why: "", ask: "" };
    const p: ForecastPerson = {
      id: "u",
      name: "U",
      avatarUrl: null,
      uncounted: 0,
      deals: [
        { ...base, amount: 10000, closeDate: "2026-11-20", hubspotPct: 80, briefPct: 40 },
        { ...base, amount: 5000, closeDate: "2026-12-15", hubspotPct: 60, briefPct: 60 },
      ],
      signed: [
        { amount: 3000, closeDate: "2026-11-03" },
        { amount: 7000, closeDate: "2026-10-12" },
      ],
    };
    const [m, q] = forecastPeriods(TODAY);
    assert.deepEqual(inPeriod(p, m).totals, { count: 1, pipeline: 10000, hubspot: 8000, brief: 4000, signed: 3000 });
    assert.deepEqual(inPeriod(p, q).totals, { count: 2, pipeline: 15000, hubspot: 11000, brief: 7000, signed: 10000 });
  });
});

test("isWon : clos avec probabilité 1 ou étape closedwon", () => {
  assert.equal(isWon(deal({}, { closed: true, probability: 1 })), true);
  assert.equal(isWon(deal({}, { closed: true, probability: 0, stageId: "closedlost" })), false);
  assert.equal(isWon(deal({}, { closed: true, probability: undefined, stageId: "closedwon" })), true);
  assert.equal(isWon(deal()), false);
});
