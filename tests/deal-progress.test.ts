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
    // À relancer (30 jours sans call) d'abord, puis à traiter (en recul).
    assert.deepEqual(deals.map((d) => d.id), ["stop", "down", "ok"]);
  });
});

describe("prochaine étape et suivi", () => {
  const withSteps = (items: { text: string; date?: string | null }[], alerts: ProgressFiche["alerts"] = []) =>
    buildDealProgress([fiche({ fields: { prochaines_etapes: items.map((i) => ({ ...item(i.text), ...("date" in i ? { date: i.date } : {}) })) }, alerts })], NOW)[0];

  test("à jour : la plus proche échéance à venir", () => {
    const d = withSteps([{ text: "Démo", date: "2026-11-10" }, { text: "Envoi devis", date: "2026-11-03" }, { text: "Récap", date: null }]);
    assert.deepEqual(d.nextStep, { date: "2026-11-03", text: "Envoi devis", status: "a_jour" });
  });

  test("en retard : toutes les dates sont passées", () => {
    const d = withSteps([{ text: "RDV", date: "2026-10-20" }, { text: "Relance", date: "2026-10-01" }]);
    assert.deepEqual(d.nextStep, { date: "2026-10-20", text: "RDV", status: "en_retard" });
  });

  test("sans suite : aucune date convenue ; non relevée : fiche d'avant le relevé des dates", () => {
    assert.equal(withSteps([{ text: "On se rappelle", date: null }]).nextStep.status, "sans_suite");
    assert.equal(withSteps([]).nextStep.status, "sans_suite");
    assert.equal(withSteps([{ text: "RDV lundi" }]).nextStep.status, "non_relevee");
    assert.equal(withSteps([{ text: "RDV lundi" }], [alert("prochaine_etape_non_datee")]).nextStep.status, "sans_suite");
  });
});

describe("deal sans call depuis longtemps", () => {
  test("date non relevée mais plus de 14 jours sans call : en retard, et la relance d'abord", () => {
    const [d] = buildDealProgress(
      [fiche({ callAt: daysAgo(40), fields: { prochaines_etapes: [item("RDV lundi")] }, alerts: [alert("decideur_absent")] })],
      NOW
    );
    assert.equal(d.nextStep.status, "en_retard");
    assert.match(d.topAction ?? "", /Relancer/);
  });
});

describe("statut et action d'un deal (Mes deals)", () => {
  test("à relancer : suite passée ou plus de 14 jours sans call", () => {
    const [d] = buildDealProgress([fiche({ callAt: daysAgo(30) })], NOW);
    assert.deepEqual(d.focus, { status: "relancer", action: "Relancer le prospect", detail: "aucun call depuis 30 jours" });
  });

  test("à traiter : le deal recule, avec l'action de l'alerte la plus lourde", () => {
    const [d] = buildDealProgress([fiche({ alerts: [alert("concurrent_evoque"), alert("decideur_toujours_absent")] })], NOW);
    assert.deepEqual(d.focus, { status: "traiter", action: "Obtenir le décideur", detail: "le deal recule" });
  });

  test("à traiter : aucune suite convenue", () => {
    const [d] = buildDealProgress([fiche({ fields: { prochaines_etapes: [{ ...item("On se rappelle"), date: null }] } })], NOW);
    assert.equal(d.focus.action, "Dater la prochaine étape");
  });

  test("en bonne voie : préparer le prochain call, à sa date", () => {
    const [d] = buildDealProgress(
      [
        // Les critères de passage d'un R2 (douleur, décideur, impact) sont remplis.
        fiche({ callId: "a", callAt: daysAgo(9), fields: { douleur: [item("d")], decideur: [item("Paul")], impact: [item("+20 %")] } }),
        fiche({ callId: "b", fields: { prochaines_etapes: [{ ...item("Démo"), date: "2026-11-03" }] } }),
      ],
      NOW
    );
    assert.equal(d.focus.status, "bonne_voie");
    assert.equal(d.focus.action, "Préparer le R3");
    assert.match(d.focus.detail ?? "", /3 nov/);
  });
});
