import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveEnabledModules, modulesForPath, blockingModuleForPath, ALL_MODULE_KEYS } from "../lib/modules";

// Parcours client (29/09/2026) : un module désactivé est invisible. Le
// middleware ferme ses pages et ses routes d'API à partir de ces règles —
// une erreur ici ouvrirait un module avant son heure, ou fermerait le socle.

describe("resolveEnabledModules", () => {
  test("organisation antérieure au parcours : tout reste actif, Entraînement suit son ancien interrupteur", () => {
    assert.deepEqual(resolveEnabledModules({ enabled_modules: null, training_enabled: false }), ALL_MODULE_KEYS.filter((k) => k !== "training"));
    assert.deepEqual(resolveEnabledModules({ enabled_modules: null, training_enabled: true }), ALL_MODULE_KEYS);
  });

  test("liste explicite : elle seule fait foi, clés inconnues ignorées", () => {
    assert.deepEqual(resolveEnabledModules({ enabled_modules: ["playbook", "inconnu"], training_enabled: true }), ["playbook"]);
    assert.deepEqual(resolveEnabledModules({ enabled_modules: [] }), []);
  });

  test("sans organisation : tout est actif", () => {
    assert.deepEqual(resolveEnabledModules(null), ALL_MODULE_KEYS);
  });
});

describe("modulesForPath", () => {
  test("le socle n'appartient à aucun module", () => {
    for (const path of ["/brief", "/brief/abc", "/feedback", "/feedback/abc", "/dashboard", "/dashboard/scores", "/settings/connexions", "/api/generate-brief", "/api/feedback/abc/key-points", "/api/calendar/events"]) {
      assert.deepEqual(modulesForPath(path), [], path);
    }
  });

  test("pages et routes d'un module, préfixe par segment entier", () => {
    assert.deepEqual(modulesForPath("/dashboard/objections"), ["objections"]);
    assert.deepEqual(modulesForPath("/api/playbook/dimensions/42"), ["playbook"]);
    assert.deepEqual(modulesForPath("/api/feedback/abc/follow-up"), ["follow_up"]);
    assert.deepEqual(modulesForPath("/tasks"), ["tasks"]);
    assert.deepEqual(modulesForPath("/tasksettings"), []);
  });

  test("un chemin qui relève de deux modules exige les deux", () => {
    assert.deepEqual(modulesForPath("/api/crm/hubspot/import-references"), ["crm", "references"]);
    assert.equal(blockingModuleForPath("/api/crm/hubspot/import-references", ["crm"]), "references");
    assert.equal(blockingModuleForPath("/api/crm/hubspot/import-references", ["crm", "references"]), null);
  });

  test("module désactivé : le chemin est fermé ; socle : jamais", () => {
    assert.equal(blockingModuleForPath("/training", []), "training");
    assert.equal(blockingModuleForPath("/brief", []), null);
  });
});
