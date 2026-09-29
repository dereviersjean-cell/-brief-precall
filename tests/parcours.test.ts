import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeParcours } from "../lib/parcours";

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
