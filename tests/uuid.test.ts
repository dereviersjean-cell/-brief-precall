import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isUuid } from "../lib/uuid";

// Garde-fou des pages de détail : un identifiant qui n'est pas un uuid doit
// donner un 404, jamais une erreur serveur. Sans lui, Postgres levait une
// 22P02 sur toute URL bricolée — et c'est ce qui est arrivé en cliquant un
// call d'exemple depuis les écrans de démonstration.

describe("isUuid", () => {
  test("accepte un uuid réel, quelle que soit la casse", () => {
    assert.equal(isUuid("5beb44e3-15e1-4e56-a253-7d5f408d9c8e"), true);
    assert.equal(isUuid("5BEB44E3-15E1-4E56-A253-7D5F408D9C8E"), true);
  });

  test("refuse ce qui ferait planter Postgres", () => {
    for (const value of [
      "demo-1", // identifiant des écrans de démonstration
      "",
      "non-classees", // segment réservé de la page objections
      "12345",
      "5beb44e3-15e1-4e56-a253", // tronqué
      "5beb44e3-15e1-4e56-a253-7d5f408d9c8e-extra",
      "5beb44e3_15e1_4e56_a253_7d5f408d9c8e", // mauvais séparateur
      "zzzzzzzz-15e1-4e56-a253-7d5f408d9c8e", // hors hexadécimal
    ]) {
      assert.equal(isUuid(value), false, `« ${value} » ne doit pas passer`);
    }
  });
});
