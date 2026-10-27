import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";

// Verrouille le verdict de « Mes deals » : un deal marqué « en progrès » à
// tort rassure le commercial sur un deal qui glisse.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const item = (text: string) => ({ text, verbatim: null, startMs: null });
const alert = (rule: ProgressFiche["alerts"][number]["rule"]) => ({ rule, text: rule, verbatim: null, startMs: null });
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

describe("buildDealProgress", () => {
  test("évolution : informations connues cumulées et apprises call par call", () => {
    const [deal] = buildDealProgress(
      [
        fiche({ callId: "c2", callAt: daysAgo(3), fields: { budget: [item("b")], douleur: [item("d2")] } }),
        fiche({ callId: "c1", callAt: daysAgo(10), fields: { douleur: [item("d")], impact: [item("i")] } }),
      ],
      NOW
    );
    assert.deepEqual(deal.steps.map((s) => [s.callId, s.known, s.learned.length]), [["c1", 2, 2], ["c2", 3, 1]]);
    assert.equal(deal.known, 3);
    assert.equal(deal.toObtain.length, 5);
    assert.equal(deal.lastCall.id, "c2");
    assert.ok(deal.reasons.some((r) => r.includes("budget")));
  });

  test("en recul dès qu'une alerte compare au call précédent", () => {
    const [deal] = buildDealProgress([fiche({ alerts: [alert("objection_recurrente"), alert("concurrent_evoque")] })], NOW);
    assert.equal(deal.verdict, "recul");
    assert.deepEqual(deal.reasons, ["Objection qui revient"]);
  });

  test("à l'arrêt sans call depuis 14 jours, ou sans prochaine étape datée", () => {
    assert.equal(buildDealProgress([fiche({ callAt: daysAgo(20) })], NOW)[0].verdict, "arret");
    const [undated] = buildDealProgress([fiche({ alerts: [alert("prochaine_etape_non_datee")] })], NOW);
    assert.equal(undated.verdict, "arret");
    assert.deepEqual(undated.reasons, ["Pas de prochaine étape datée"]);
  });

  test("en progrès : call récent, suite datée, rien qui recule — même sans rien de nouveau à apprendre", () => {
    const [deal] = buildDealProgress([fiche({ alerts: [alert("concurrent_evoque")] })], NOW);
    assert.equal(deal.verdict, "progres");
  });

  test("les deals qui demandent de l'attention passent devant", () => {
    const deals = buildDealProgress(
      [
        fiche({ dealId: "ok", callId: "a" }),
        fiche({ dealId: "stop", callId: "b", callAt: daysAgo(30) }),
        fiche({ dealId: "down", callId: "c", alerts: [alert("sentiment_en_baisse")] }),
      ],
      NOW
    );
    assert.deepEqual(deals.map((d) => d.id), ["down", "stop", "ok"]);
  });
});
