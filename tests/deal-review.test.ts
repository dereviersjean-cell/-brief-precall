import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";
import { buildDealReview } from "../lib/deal-review";

// Verrouille le bilan du manager sur la page d'un deal : ce qui est classé
// « bien fait », « à corriger », et quand on lui dit d'intervenir.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const item = (text: string) => ({ text, verbatim: null, startMs: null });
const alert = (rule: ProgressFiche["alerts"][number]["rule"], text: string = rule) => ({ rule, text, verbatim: null, startMs: null });
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
const review = (fiches: ProgressFiche[], objections: Parameters<typeof buildDealReview>[1] = {}) =>
  buildDealReview(fiches, objections, buildDealProgress(fiches, NOW)[0]);

describe("buildDealReview", () => {
  test("bien fait : infos obtenues, suite datée, décideur identifié, objection bien traitée", () => {
    const r = review(
      [fiche({ callId: "c1", fields: { decideur: [item("Paul")], budget: [item("10 k€")] } })],
      { c1: [{ objection: "Trop cher", handlingQuality: "bien_traitee", handlingComment: null }] }
    );
    assert.ok(r.good.some((g) => g.startsWith("2 informations clés sur 8")));
    assert.ok(r.good.includes("Le dernier call se termine sur une prochaine étape datée"));
    assert.ok(r.good.includes("Le décideur est identifié"));
    assert.ok(r.good.includes("Objection bien traitée : Trop cher"));
    assert.equal(r.intervene, "non");
    assert.equal(r.intervention, null);
  });

  test("à corriger : alertes du dernier call, objections mal traitées (sans doublon), manques après plusieurs calls", () => {
    const r = review(
      [
        fiche({ callId: "c1", callAt: daysAgo(9), fields: { douleur: [item("d")] } }),
        fiche({ callId: "c2", callAt: daysAgo(2), alerts: [alert("objection_recurrente", "Le prix revient")] }),
      ],
      {
        c1: [{ objection: "Prix", handlingQuality: "non_traitee", handlingComment: "Pas de réponse" }],
        c2: [{ objection: "prix ", handlingQuality: "partiellement", handlingComment: null }],
      }
    );
    assert.ok(r.bad.includes("Objection qui revient : Le prix revient"));
    assert.equal(r.bad.filter((b) => b.startsWith("Objection mal traitée")).length, 1);
    assert.ok(r.bad.some((b) => b.startsWith("Toujours inconnu après 2 calls")));
    assert.equal(r.intervene, "oui");
    assert.ok(r.intervention);
  });

  test("à surveiller quand le deal stagne, avec la relance proposée", () => {
    const r = review([fiche({ callAt: daysAgo(30) })]);
    assert.equal(r.intervene, "surveiller");
    assert.ok(r.bad.includes("Aucun call depuis 30 jours"));
    assert.match(r.intervention ?? "", /Relancer/);
  });
});
