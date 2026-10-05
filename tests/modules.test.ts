import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveEnabledModules,
  modulesForPath,
  blockingModuleForPath,
  ALL_MODULE_KEYS,
  resolveAccessLevel,
  isPageOpenInBriefsAccess,
  isApiClosedInBriefsAccess,
} from "../lib/modules";

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

// Inscription libre (05/10/2026) : une organisation en accès « briefs » n'a
// que la page Brief, et ne peut pas brancher le bot d'enregistrement, payé à
// l'heure. Une organisation existante (colonne absente) reste en accès complet.
describe("niveau d'accès", () => {
  test("seul 'briefs' restreint ; absent ou inconnu = accès complet", () => {
    assert.equal(resolveAccessLevel({ access_level: "briefs" }), "briefs");
    assert.equal(resolveAccessLevel({ access_level: "full" }), "full");
    assert.equal(resolveAccessLevel({}), "full");
    assert.equal(resolveAccessLevel({ access_level: "autre" }), "full");
    assert.equal(resolveAccessLevel(null), "full");
  });

  test("pages ouvertes en accès « briefs » : brief, onboarding, réglages généraux", () => {
    for (const path of ["/brief", "/brief/abc", "/onboarding", "/settings/general"]) {
      assert.equal(isPageOpenInBriefsAccess(path), true, path);
    }
    for (const path of ["/dashboard", "/feedback/1", "/settings", "/settings/connexions", "/help", "/briefs", "/bienvenue"]) {
      assert.equal(isPageOpenInBriefsAccess(path), false, path);
    }
  });

  test("branchement de l'agenda fermé, webhooks Recall non concernés", () => {
    assert.equal(isApiClosedInBriefsAccess("/api/recall/google-oauth/start"), true);
    assert.equal(isApiClosedInBriefsAccess("/api/recall/microsoft-oauth/callback"), true);
    assert.equal(isApiClosedInBriefsAccess("/api/recall/sync-and-schedule"), true);
    assert.equal(isApiClosedInBriefsAccess("/api/recall/webhook"), false);
    assert.equal(isApiClosedInBriefsAccess("/api/recall/bot-webhook"), false);
  });
});
