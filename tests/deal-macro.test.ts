import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealChronology } from "../lib/deal-chronology";
import { buildDealTimeline } from "../lib/deal-timeline";
import { buildDealProgressNow, type ProgressFiche } from "../lib/deal-progress";
import { DEFAULT_RULES } from "../lib/deal-rules";
import { buildDealMacro, commitmentKey, lateCommitment } from "../lib/deal-macro";
import type { DealMemoryItem } from "../lib/deal-memory-schema";

// Verrouille la vue Deal « macro » : le statut des engagements (fait, à faire,
// en retard), l'état du deal et l'historique sans répétition.

const item = (text: string, level?: "confirme" | "evoque", date?: string): DealMemoryItem => ({
  text,
  verbatim: text,
  startMs: null,
  ...(level ? { level } : {}),
  ...(date ? { date } : {}),
});

const fiche = (callId: string, callAt: string, fields: ProgressFiche["fields"]): ProgressFiche & { ownerId: string } => ({
  dealId: "d1",
  dealName: "CDA Jobs",
  hubspot: null,
  callId,
  callAt,
  callTitle: null,
  ownerId: "u1",
  fields,
  alerts: [],
});

const fiches = [
  fiche("c1", "2026-10-20T10:00:00Z", {
    douleur: [item("Besoin de rendez-vous", "confirme")],
    prochaines_etapes: [item("Nouveau call fixé le 30 octobre", undefined, "2026-10-30")],
  }),
  fiche("c2", "2026-10-30T10:00:00Z", {
    budget: [item("1 500 € par mois", "confirme")],
    decideur: [item("Pas encore nommé", "evoque")],
    prochaines_etapes: [
      item("Envoyer les deux propositions à Laetitia", undefined, "2026-11-02"),
      item("Call de 15 minutes jeudi pour présenter l'offre", undefined, "2026-11-05"),
      item("Préparer le ciblage"),
    ],
  }),
];
const now = Date.parse("2026-11-03T12:00:00Z");

function macro(done: Set<string> = new Set()) {
  const timeline = buildDealTimeline(fiches, DEFAULT_RULES);
  const [progress] = buildDealProgressNow(fiches, DEFAULT_RULES);
  return buildDealMacro({ fiches, progress, timeline, chrono: buildDealChronology(timeline, now), done, now });
}

describe("deal-macro", () => {
  test("engagements du dernier call : en retard, à venir, sans date", () => {
    const m = macro();
    assert.deepEqual(
      m.commitments.map((c) => [c.status, c.isMeeting]),
      [
        ["retard", false],
        ["a_faire", true],
        ["a_faire", false],
      ]
    );
    assert.equal(lateCommitment(m)?.text, "Envoyer les deux propositions à Laetitia");
    assert.deepEqual(m.nextMeeting, { date: "2026-11-05", rank: 3 });
  });

  test("un engagement coché n'est plus en retard et ne prend plus la priorité", () => {
    const m = macro(new Set([commitmentKey("c2", 0, "Envoyer les deux propositions à Laetitia")]));
    assert.equal(m.commitments[0].status, "fait");
    assert.equal(lateCommitment(m), null);
  });

  test("un coche dont le texte a changé ne vaut plus", () => {
    const m = macro(new Set([commitmentKey("c2", 0, "Ancien texte")]));
    assert.equal(m.commitments[0].status, "retard");
  });

  test("état du deal : confirmé, à préciser, inconnu", () => {
    const byKey = Object.fromEntries(macro().state.map((r) => [r.key, r.status]));
    assert.equal(byKey.douleur, "confirme");
    assert.equal(byKey.budget, "confirme");
    assert.equal(byKey.decideur, "a_preciser");
    assert.equal(byKey.champion, "inconnu");
  });

  test("un rendez-vous tenu n'est pas répété dans l'historique", () => {
    const h = macro().history;
    assert.deepEqual(
      h.map((r) => r.label),
      ["R1", "R2", "Engagement", "RDV prévu"]
    );
    assert.equal(h[2].tone, "late");
  });
});
