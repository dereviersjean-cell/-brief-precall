import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildBoard, buildStages, buildTeam, INTERVENTIONS, isHighRisk, morningQueue, REP_ACTIONS, sortByWeight, type BoardFicheRow } from "../lib/deal-board";

// Verrouille la file du manager : ce qui y figure, dans quel ordre, et quand
// un deal en sort. Une dérive ici cache un deal à risque, ou en remontre un
// que le manager a déjà traité.

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const hubspot = (stage: string, stageIndex: number, amount: number | null, closed = false) => ({
  id: "hs",
  name: null,
  pipeline: "Sales",
  stage,
  stageIndex,
  stageCount: 7,
  closed,
  amount,
  closeDate: null,
  nextStep: null,
  url: null,
});
const alert = (rule: BoardFicheRow["alerts"][number]["rule"]) => ({ rule, text: rule, verbatim: null, startMs: null });

const row = (over: Partial<BoardFicheRow>): BoardFicheRow => ({
  dealId: "d1",
  dealName: "Deal",
  hubspot: null,
  callId: "c1",
  callAt: daysAgo(2),
  callTitle: null,
  ownerId: "u1",
  generatedAt: daysAgo(1),
  alerts: [],
  ...over,
});

describe("buildBoard", () => {
  test("un deal prend les alertes de son call le plus récent, pas des anciens", () => {
    const [deal] = buildBoard(
      [
        row({ callId: "old", callAt: daysAgo(10), alerts: [alert("concurrent_evoque")] }),
        row({ callId: "new", callAt: daysAgo(2), alerts: [alert("preuve_sociale")] }),
      ],
      [],
      NOW
    );
    assert.equal(deal.lastCall.id, "new");
    assert.deepEqual(deal.alerts.map((a) => a.rule), ["preuve_sociale"]);
    assert.equal(deal.callCount, 2);
  });

  test("l'inactivité s'ajoute dès 14 jours sans call, sans masquer l'intervention tirée du call", () => {
    const [idle] = buildBoard([row({ callAt: daysAgo(20) })], [], NOW);
    assert.deepEqual(idle.alerts.map((a) => a.rule), ["inactivite"]);
    assert.equal(idle.intervention, INTERVENTIONS.inactivite);
    const [both] = buildBoard([row({ callAt: daysAgo(20), alerts: [alert("decideur_absent")] })], [], NOW);
    assert.equal(both.intervention, INTERVENTIONS.decideur_absent);
  });

  test("le plus à risque d'abord, puis le plus gros montant ; un deal clos sort de la file", () => {
    const deals = buildBoard(
      [
        row({ dealId: "petit", hubspot: hubspot("Qualified", 2, 1000), alerts: [alert("preuve_sociale")] }),
        row({ dealId: "gros", hubspot: hubspot("Qualified", 2, 50000), alerts: [alert("preuve_sociale")] }),
        row({ dealId: "risque", alerts: [alert("decideur_toujours_absent")] }),
        row({ dealId: "clos", hubspot: hubspot("Closed Won", 6, 90000, true), alerts: [alert("decideur_absent")] }),
      ],
      [],
      NOW
    );
    assert.deepEqual(deals.map((d) => d.id), ["risque", "gros", "petit"]);
  });

  test("« Vu » cache le deal jusqu'à sa prochaine fiche, « Plus tard » pendant 24 h", () => {
    const rows = [row({ dealId: "a", generatedAt: daysAgo(3) }), row({ dealId: "b", generatedAt: daysAgo(3) }), row({ dealId: "c", generatedAt: daysAgo(1) })];
    const deals = buildBoard(
      rows,
      [
        { dealId: "a", status: "seen", reviewedAt: daysAgo(2) },
        { dealId: "b", status: "later", reviewedAt: daysAgo(2) },
        { dealId: "c", status: "seen", reviewedAt: daysAgo(2) },
      ],
      NOW
    );
    const hidden = Object.fromEntries(deals.map((d) => [d.id, d.hiddenBecause]));
    assert.deepEqual(hidden, { a: "seen", b: null, c: null });
  });
});

describe("buildStages et buildTeam", () => {
  test("le bandeau suit l'ordre du pipeline, les deals sans HubSpot à part", () => {
    const deals = buildBoard(
      [
        row({ dealId: "x", hubspot: hubspot("Contract Sent", 5, null), alerts: [alert("preuve_sociale")] }),
        row({ dealId: "y", hubspot: hubspot("Qualified", 2, null) }),
        row({ dealId: "z" }),
      ],
      [],
      NOW
    );
    assert.deepEqual(
      buildStages(deals).map((s) => [s.label, s.count, s.atRisk]),
      [
        ["Qualified", 1, 0],
        ["Contract Sent", 1, 1],
        ["Hors HubSpot", 1, 0],
      ]
    );
  });

  test("le point à travailler d'un commercial revient sur au moins deux deals, l'inactivité n'en est pas un", () => {
    const deals = buildBoard(
      [
        row({ dealId: "a", callId: "ca", callAt: daysAgo(30), alerts: [alert("prochaine_etape_non_datee")] }),
        row({ dealId: "b", callId: "cb", callAt: daysAgo(30), alerts: [alert("prochaine_etape_non_datee"), alert("preuve_sociale")] }),
        row({ dealId: "c", callId: "cc", ownerId: "u2", alerts: [alert("preuve_sociale")] }),
      ],
      [],
      NOW
    );
    const [u1, u2] = buildTeam(deals, ["u1", "u2"]);
    assert.equal(u1.deals, 2);
    assert.equal(u1.datedNextStepShare, 0);
    assert.equal(u1.recurring?.rule, "prochaine_etape_non_datee");
    assert.deepEqual(u1.recurring?.calls.map((c) => c.id).sort(), ["ca", "cb"]);
    assert.equal(u2.recurring, null);
  });
});

describe("emails d'alerte", () => {
  test("risque élevé : seulement quand une alerte compare plusieurs calls", () => {
    assert.equal(isHighRisk(["objection_recurrente"]), true);
    assert.equal(isHighRisk(["sentiment_en_baisse", "concurrent_evoque"]), true);
    assert.equal(isHighRisk(["decideur_toujours_absent"]), true);
    // Un signal d'un seul call, même lourd, attend l'email du matin.
    assert.equal(isHighRisk(["decideur_absent", "prochaine_etape_non_datee", "concurrent_evoque"]), false);
    assert.equal(isHighRisk(["inactivite"]), false);
    assert.equal(isHighRisk([]), false);
  });

  test("les alertes se lisent de la plus lourde à la plus légère", () => {
    const sorted = sortByWeight([alert("concurrent_evoque"), alert("decideur_absent"), alert("objection_recurrente")]);
    assert.deepEqual(sorted.map((a) => a.rule), ["objection_recurrente", "decideur_absent", "concurrent_evoque"]);
  });

  test("chaque alerte a une action pour le commercial et une pour le manager", () => {
    assert.deepEqual(Object.keys(REP_ACTIONS).sort(), Object.keys(INTERVENTIONS).sort());
  });

  test("l'email du matin reprend la file sans les deals vus, et rien quand rien ne va mal", () => {
    const rows = [
      row({ dealId: "a", dealName: "A", alerts: [alert("objection_recurrente")] }),
      row({ dealId: "b", dealName: "B", alerts: [alert("concurrent_evoque")] }),
      row({ dealId: "c", dealName: "C", alerts: [] }),
    ];
    const board = buildBoard(rows, [{ dealId: "b", status: "seen", reviewedAt: daysAgo(0) }], NOW);
    const { shown, total } = morningQueue(board);
    assert.deepEqual(shown.map((d) => d.name), ["A"]);
    assert.equal(total, 1);
    assert.equal(morningQueue(buildBoard([rows[2]], [], NOW)).total, 0);
  });

  test("l'email du matin s'arrête à cinq deals mais compte les autres", () => {
    const rows = Array.from({ length: 7 }, (_, i) => row({ dealId: `d${i}`, dealName: `D${i}`, alerts: [alert("decideur_absent")] }));
    const { shown, total } = morningQueue(buildBoard(rows, [], NOW));
    assert.equal(shown.length, 5);
    assert.equal(total, 7);
  });
});
