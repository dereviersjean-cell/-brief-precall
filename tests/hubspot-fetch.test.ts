import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isSearchUrl, shouldRetry, retryDelayMs, nextSlot } from "../lib/crm/hubspot-fetch";

// Le cron de 7 h du 25/11/2026 est tombé sur « Recherche des deals HubSpot
// refusée » : HubSpot limite /search à 5 appels par seconde et par portail, et
// la pagination du parcours des pipelines en envoyait ~7. Ces règles sont
// l'espacement qui l'évite et la reprise qui rattrape le reste.

describe("isSearchUrl", () => {
  test("reconnaît les endpoints de recherche, pas les autres", () => {
    assert.equal(isSearchUrl("https://api.hubapi.com/crm/v3/objects/deals/search"), true);
    assert.equal(isSearchUrl("https://api.hubapi.com/crm/v3/objects/companies/search"), true);
    assert.equal(isSearchUrl("https://api.hubapi.com/crm/v3/objects/deals/batch/read"), false);
    assert.equal(isSearchUrl("https://api.hubapi.com/crm/v3/pipelines/deals"), false);
  });
});

describe("shouldRetry", () => {
  test("reprend sur 429", () => {
    assert.equal(shouldRetry(429), true);
  });

  test("ne reprend sur rien d'autre : un 5xx sur une écriture a pu passer", () => {
    for (const status of [200, 400, 401, 403, 404, 500, 502, 503]) {
      assert.equal(shouldRetry(status), false, `statut ${status}`);
    }
  });
});

describe("retryDelayMs", () => {
  test("suit Retry-After quand HubSpot l'envoie", () => {
    assert.equal(retryDelayMs(1, "3"), 3000);
  });

  test("plafonne Retry-After : on ne dort pas une minute dans un cron", () => {
    assert.equal(retryDelayMs(1, "120"), 10_000);
  });

  test("à défaut d'en-tête, 1 s puis 2 s puis 4 s, plus la dispersion", () => {
    assert.equal(retryDelayMs(1, null, 0), 1000);
    assert.equal(retryDelayMs(2, null, 0), 2000);
    assert.equal(retryDelayMs(3, null, 0), 4000);
    assert.equal(retryDelayMs(1, null, 1), 1250);
  });

  test("un Retry-After absurde est ignoré au profit de l'attente par défaut", () => {
    assert.equal(retryDelayMs(1, "zéro", 0), 1000);
    assert.equal(retryDelayMs(1, "0", 0), 1000);
    assert.equal(retryDelayMs(1, "-5", 0), 1000);
  });
});

describe("nextSlot", () => {
  test("trois appels dans la même milliseconde partent à 0, un gap, deux gaps", () => {
    let last = 0;
    const at: number[] = [];
    for (let i = 0; i < 3; i++) {
      const slot = nextSlot(1_000_000, last, 220);
      at.push(slot.at);
      last = slot.lastSlot;
    }
    assert.deepEqual(at, [1_000_000, 1_000_220, 1_000_440]);
  });

  test("un appel qui arrive après le dernier créneau part tout de suite", () => {
    assert.deepEqual(nextSlot(2_000_000, 1_000_000, 220), { at: 2_000_000, lastSlot: 2_000_220 });
  });

  test("21 pages tiennent sous les 5 par seconde", () => {
    let last = 0;
    const start = nextSlot(0, last, 220);
    last = start.lastSlot;
    let at = start.at;
    for (let i = 1; i < 21; i++) {
      const slot = nextSlot(0, last, 220);
      at = slot.at;
      last = slot.lastSlot;
    }
    // 20 intervalles de 220 ms : 4,4 s pour 21 recherches, soit 4,8/s.
    assert.equal(at, 4400);
    assert.ok(21 / (at / 1000) < 5);
  });
});
