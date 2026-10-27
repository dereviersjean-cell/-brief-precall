import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { adviceFor } from "../lib/deal-advice";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";

// Verrouille le conseil de « Mes deals » : quoi, pourquoi, comment et quand
// portent sur la même action ; une phrase à dire est entre guillemets.

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
const advice = (fiches: ProgressFiche[]) => adviceFor(buildDealProgress(fiches, NOW)[0]);

describe("adviceFor", () => {
  test("à relancer : l'engagement pris en citation, une phrase de relance, aujourd'hui", () => {
    const a = advice([fiche({ callAt: daysAgo(30), fields: { douleur: [item("d")], prochaines_etapes: [item("Démo lundi", "2026-10-05")] } })]);
    assert.equal(a.title, "Relancer le prospect");
    assert.equal(a.when, "Aujourd'hui");
    assert.equal(a.quote?.text, "Démo lundi");
    assert.ok(a.how.some((h) => h.startsWith("«")));
  });

  test("critère de passage : pourquoi et questions portent sur l'information manquante, pas sur une autre alerte", () => {
    const a = advice([
      fiche({ callId: "a", callAt: daysAgo(9), fields: { douleur: [item("d")] } }),
      fiche({
        callId: "b",
        fields: { prochaines_etapes: [item("Démo", "2026-11-03")] },
        alerts: [{ rule: "preuve_sociale", text: "Veut un cas client", verbatim: "Vous avez des références ?", startMs: null }],
      }),
    ]);
    assert.match(a.title, /^Obtenir : /);
    assert.match(a.why, /décideur économique/);
    assert.equal(a.quote, null);
    assert.ok(a.how[0].includes("Au-delà de vous, qui validera"));
    assert.match(a.how.at(-1) ?? "", /Autre point du dernier call/);
    assert.match(a.when, /^Avant le 3 novembre/);
  });

  test("alerte du call : la phrase prononcée en citation", () => {
    const a = advice([
      fiche({
        fields: { douleur: [item("d")], prochaines_etapes: [item("Démo", "2026-11-03")] },
        alerts: [{ rule: "concurrent_evoque", text: "Compare avec X", verbatim: "On regarde aussi X", startMs: null }],
      }),
    ]);
    assert.equal(a.title, "Se démarquer du concurrent");
    assert.equal(a.quote?.text, "On regarde aussi X");
  });
});
