import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblem } from "../lib/password";

// Connexion par email (14/10/2026) : le mot de passe n'est jamais stocké, seule
// son empreinte scrypt l'est. Ces tests verrouillent l'aller-retour et les
// refus — une vérification qui accepterait une empreinte vide ou mal formée
// ouvrirait n'importe quel compte sans mot de passe.
describe("mots de passe", () => {
  test("le bon mot de passe passe, un autre non", async () => {
    const stored = await hashPassword("correct horse battery");
    assert.match(stored, /^scrypt\$/);
    assert.equal(stored.includes("correct horse battery"), false);
    assert.equal(await verifyPassword("correct horse battery", stored), true);
    assert.equal(await verifyPassword("correct horse batterY", stored), false);
  });

  test("deux empreintes du même mot de passe diffèrent (sel)", async () => {
    assert.notEqual(await hashPassword("même mot"), await hashPassword("même mot"));
  });

  test("un compte sans mot de passe ou une empreinte mal formée refusent tout", async () => {
    for (const stored of [null, undefined, "", "scrypt$", "md5$abc$def", "n'importe quoi"]) {
      assert.equal(await verifyPassword("", stored), false);
      assert.equal(await verifyPassword("x", stored), false);
    }
  });

  test("longueur minimale", () => {
    assert.ok(passwordProblem("court"));
    assert.equal(passwordProblem("assez long"), null);
  });
});
