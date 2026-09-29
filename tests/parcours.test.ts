import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeParcours, evaluateCriterion, stepsForReview, type CriterionInput } from "../lib/parcours";

// Espace « Suivi clients » : la semaine du parcours et le module en retard
// décident de ce que l'account manager prépare pour son point. Une erreur
// ici lui ferait ouvrir un module trop tôt, ou en oublier un.

const NOW = new Date("2026-10-15T10:00:00");

describe("computeParcours", () => {
  test("semaine 0 le jour du démarrage, premier module à ouvrir = Playbook", () => {
    const p = computeParcours("2026-10-15", [], NOW);
    assert.equal(p.week, 0);
    assert.equal(p.nextModule?.key, "playbook");
    assert.equal(p.late, false);
  });

  test("semaine 3 sans Playbook ouvert : pas encore en retard (c'est sa semaine)", () => {
    const p = computeParcours("2026-09-24", [], NOW);
    assert.equal(p.week, 3);
    assert.equal(p.late, false);
  });

  test("semaine 4 sans Playbook ouvert : en retard", () => {
    const p = computeParcours("2026-09-17", [], NOW);
    assert.equal(p.week, 4);
    assert.equal(p.nextModule?.key, "playbook");
    assert.equal(p.late, true);
  });

  test("l'état reste transmissible au navigateur (aucune RegExp, même quand le prochain module en a)", () => {
    const p = computeParcours("2026-09-17", ["playbook"], NOW);
    assert.equal(p.nextModule?.key, "follow_up");
    // Une RegExp deviendrait {} à l'aller-retour JSON : l'égalité le détecte.
    assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
  });

  test("modules ouverts dans l'ordre : le prochain est le suivant du parcours", () => {
    const p = computeParcours("2026-09-17", ["playbook", "follow_up"], NOW);
    assert.equal(p.nextModule?.key, "objections");
    assert.equal(p.late, false);
  });

  test("au-delà de 8 semaines : parcours terminé, semaine plafonnée à 8", () => {
    const p = computeParcours("2026-07-01", [], NOW);
    assert.equal(p.week, 8);
    assert.equal(p.finished, true);
  });

  test("sans date de début : pas de semaine, jamais en retard", () => {
    const p = computeParcours(null, [], NOW);
    assert.equal(p.week, null);
    assert.equal(p.late, false);
  });

  test("tout le parcours ouvert : plus de prochain module (Slack et Références sont à la demande)", () => {
    const p = computeParcours("2026-07-01", ["playbook", "follow_up", "objections", "crm", "tasks", "training", "insights", "weekly_digest"], NOW);
    assert.equal(p.nextModule, null);
  });
});

// Rapport de préparation du point : l'étape présentée et son critère de
// passage. Une erreur ici ferait ouvrir un module alors que le précédent ne
// sert pas encore — ce que le parcours interdit.
describe("stepsForReview", () => {
  test("semaine 0 : mise en route, pas d'étape précédente", () => {
    const { present, gate } = stepsForReview(0, 3);
    assert.equal(present.week, 0);
    assert.equal(gate, null);
  });

  test("semaine 1 : on présente les briefs, pas le Playbook de la semaine 3", () => {
    const { present, gate } = stepsForReview(1, 3);
    assert.equal(present.week, 1);
    assert.equal(gate?.week, 0);
  });

  test("semaine 5 avec le Playbook toujours fermé : on ne saute pas d'étape", () => {
    const { present, gate } = stepsForReview(5, 3);
    assert.equal(present.week, 3);
    assert.deepEqual(present.modules, ["playbook"]);
    assert.equal(gate?.week, 2);
  });

  test("au-delà de la semaine 8, tout ouvert : on reste au bilan", () => {
    assert.equal(stepsForReview(12, null).present.week, 8);
  });
});

const BASE: CriterionInput = {
  members: [
    { label: "Paul", role: "commercial", status: "active", agenda: "connected", briefs: 2, trainingSessions: 0 },
    { label: "Léa", role: "commercial", status: "active", agenda: "missing", briefs: 0, trainingSessions: 1 },
    { label: "Marc", role: "manager", status: "invited", agenda: "missing", briefs: 0, trainingSessions: 0 },
  ],
  analyzedCalls: 3,
  playbookDefined: false,
  followUpsSent: 0,
  topObjections: [
    { label: "Trop cher", answered: true },
    { label: "Pas le moment", answered: false },
  ],
  crmConnected: false,
};

describe("evaluateCriterion", () => {
  test("mise en route : nomme l'invitation en attente et l'agenda non branché", () => {
    const r = evaluateCriterion(0, BASE);
    assert.equal(r.status, "unmet");
    assert.deepEqual(r.missing, ["Marc n'a pas encore accepté son invitation", "Léa n'a pas branché son agenda"]);
  });

  test("briefs : jugé sur les commerciaux, pas sur le manager", () => {
    const r = evaluateCriterion(1, BASE);
    assert.equal(r.status, "unmet");
    assert.deepEqual(r.missing, ["Léa n'a encore aucun brief"]);
  });

  test("analyse : 5 calls analysés requis", () => {
    assert.equal(evaluateCriterion(2, BASE).status, "unmet");
    assert.equal(evaluateCriterion(2, { ...BASE, analyzedCalls: 5 }).status, "met");
  });

  test("objections : chaque objection fréquente sans réponse est nommée", () => {
    const r = evaluateCriterion(5, BASE);
    assert.equal(r.status, "unmet");
    assert.deepEqual(r.missing, ["Écrire la réponse attendue pour « Pas le moment »"]);
  });

  test("objections : sans catégorie, le critère n'est pas atteint", () => {
    assert.equal(evaluateCriterion(5, { ...BASE, topObjections: [] }).status, "unmet");
  });

  test("entraînement : un commercial qui ne s'est pas entraîné est nommé", () => {
    const r = evaluateCriterion(7, BASE);
    assert.deepEqual(r.missing, ["Paul ne s'est pas encore entraîné"]);
    assert.equal(r.detail, "1 commercial sur 2 s'est entraîné.");
  });

  test("bilan : décision prise pendant le point, rien à mesurer", () => {
    assert.equal(evaluateCriterion(8, BASE).status, "manual");
  });
});
