import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildActionPlan, buildQualification, priorItems, QUALIFICATION_FIELDS } from "../lib/deal-actions";
import type { DealOverview, StoredDealMemory } from "../lib/deal-memory-schema";

// Verrouille l'analyse d'un call centrée sur le deal : ce qui est « nouveau »,
// « déjà connu » ou « à obtenir », et ce qui entre dans « à faire avant le
// prochain call ». Une dérive ici dit au commercial qu'il lui manque une
// information qu'il a, ou l'inverse.

const item = (text: string) => ({ text, verbatim: null, startMs: null });
const fiche = (over: Partial<StoredDealMemory> = {}): StoredDealMemory => ({
  fields: {},
  alerts: [],
  model: "test",
  generatedAt: "2026-10-20T10:00:00Z",
  ...over,
});
const deal = (memory: DealOverview["memory"]): DealOverview => ({
  id: "d",
  name: "Deal",
  hubspot: null,
  idleDays: 0,
  calls: [
    { callId: "c1", callAt: "2026-10-01T10:00:00Z", title: "R1", alertCount: 0, isCurrent: false },
    { callId: "c2", callAt: "2026-10-08T10:00:00Z", title: "R2", alertCount: 0, isCurrent: true },
    { callId: "c3", callAt: "2026-10-15T10:00:00Z", title: "R3", alertCount: 0, isCurrent: false },
  ],
  memory,
});

describe("priorItems", () => {
  test("ne garde que les calls antérieurs au call regardé", () => {
    const prior = priorItems(
      deal({
        budget: [
          { ...item("budget R3"), callId: "c3", callAt: "2026-10-15T10:00:00Z" },
          { ...item("budget R1"), callId: "c1", callAt: "2026-10-01T10:00:00Z" },
        ],
        echeance: [{ ...item("échéance R2"), callId: "c2", callAt: "2026-10-08T10:00:00Z" }],
      }),
      "c2"
    );
    assert.deepEqual(prior.budget?.map((i) => i.text), ["budget R1"]);
    assert.equal(prior.echeance, undefined);
  });
});

describe("buildQualification", () => {
  test("nouveau, précisé, déjà connu, à obtenir", () => {
    const rows = buildQualification(
      fiche({ fields: { douleur: [item("douleur ici")], budget: [item("budget précisé")] } }),
      { budget: [{ ...item("budget avant"), callAt: "2026-10-01T10:00:00Z" }], decideur: [{ ...item("Paul, CEO"), callAt: "2026-10-01T10:00:00Z" }] },
      "2026-10-08T10:00:00Z"
    );
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    assert.equal(rows.length, QUALIFICATION_FIELDS.length);
    assert.equal(by.douleur.status, "nouveau");
    assert.equal(by.budget.status, "precise");
    assert.equal(by.budget.latest?.text, "budget précisé");
    assert.equal(by.decideur.status, "connu");
    assert.equal(by.decideur.latestAt, "2026-10-01T10:00:00Z");
    assert.equal(by.echeance.status, "manquant");
    assert.equal(by.echeance.latest, null);
  });
});

describe("buildActionPlan", () => {
  test("engagements, alertes avec leur action (les plus lourdes d'abord), objections mal traitées, cases vides", () => {
    const f = fiche({
      fields: { prochaines_etapes: [item("Envoyer la proposition jeudi")] },
      alerts: [
        { rule: "concurrent_evoque", text: "Cite un concurrent", verbatim: "On regarde aussi X", startMs: null },
        { rule: "objection_recurrente", text: "Le prix revient", verbatim: "C'est cher", startMs: null },
      ],
    });
    const plan = buildActionPlan(
      f,
      [
        { objection: "Trop cher", handlingQuality: "non_traitee", handlingComment: "Pas de réponse", verbatim: null },
        { objection: "Délai", handlingQuality: "bien_traitee", handlingComment: null, verbatim: null },
      ],
      buildQualification(f, {}, null)
    );
    assert.deepEqual(plan.engagements.map((e) => e.text), ["Envoyer la proposition jeudi"]);
    assert.deepEqual(plan.risks.map((r) => r.rule), ["objection_recurrente", "concurrent_evoque"]);
    assert.ok(plan.risks.every((r) => r.action.length > 0));
    assert.deepEqual(plan.objections.map((o) => o.objection), ["Trop cher"]);
    assert.equal(plan.toObtain.length, QUALIFICATION_FIELDS.length);
  });

  test("le décideur n'est pas demandé deux fois quand une alerte en parle déjà", () => {
    const f = fiche({ alerts: [{ rule: "decideur_absent", text: "Pas là", verbatim: null, startMs: null }] });
    const plan = buildActionPlan(f, [], buildQualification(f, {}, null));
    assert.ok(!plan.toObtain.some((q) => q.key === "decideur"));
    assert.equal(plan.risks[0].rule, "decideur_absent");
  });
});
