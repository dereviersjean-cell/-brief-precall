import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealChronology } from "../lib/deal-chronology";
import { buildDealTimeline, type TimelineFiche } from "../lib/deal-timeline";
import { DEFAULT_RULES } from "../lib/deal-rules";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille la chronologie d'un deal : la progression des informations
// clés, et les rendez-vous convenus confrontés aux calls qui ont suivi.

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

const fiches = [
  fiche("c1", "2026-04-21T13:30:00Z", {
    douleur: [item("prospection", "confirme")],
    budget: [item("pas chiffré", "evoque")],
    prochaines_etapes: [item("Nouveau call fixé le 19 mai à 11h", undefined, "2026-05-19"), item("Envoyer le devis", undefined, "2026-04-25")],
  }),
  fiche("c2", "2026-05-20T09:00:00Z", {
    budget: [item("1 500 €/mois", "confirme")],
    prochaines_etapes: [item("Point de retour fixé le 28 mai", undefined, "2026-05-28"), item("Un échange avec le DG", undefined, "2026-12-01")],
  }),
];
const now = Date.parse("2026-10-28T12:00:00Z");

describe("deal-chronology", () => {
  const chrono = buildDealChronology(buildDealTimeline(fiches, DEFAULT_RULES), now);

  test("ce que chaque call a fait gagner", () => {
    const calls = chrono.events.filter((e) => e.kind === "call");
    assert.deepEqual(
      calls.map((c) => (c.kind === "call" ? [c.rank, c.known, c.gained] : null)),
      [
        [1, 1, 1],
        [2, 2, 1],
      ]
    );
    assert.deepEqual(
      chrono.points.map((p) => p.known),
      [1, 2]
    );
  });

  test("un rendez-vous convenu est confronté aux calls qui suivent, à 3 jours près", () => {
    const planned = chrono.events.filter((e) => e.kind === "planned");
    const status = Object.fromEntries(planned.map((p) => (p.kind === "planned" ? [p.text, p.status] : [])));
    assert.equal(status["Nouveau call fixé le 19 mai à 11h"], "held");
    assert.equal(status["Point de retour fixé le 28 mai"], "missed");
    assert.equal(status["Un échange avec le DG"], "upcoming");
    // Un engagement qui n'annonce pas de rencontre n'est jamais « manqué ».
    assert.equal(status["Envoyer le devis"], null);
  });

  test("l'ordre du temps, le silence depuis le dernier call, la fin de l'axe", () => {
    assert.deepEqual(
      chrono.events.map((e) => e.date?.slice(0, 10)),
      ["2026-04-21", "2026-04-25", "2026-05-19", "2026-05-20", "2026-05-28", "2026-12-01"]
    );
    assert.equal(chrono.silenceDays, 161);
    assert.equal(chrono.end.slice(0, 10), "2026-12-01");
  });
});
