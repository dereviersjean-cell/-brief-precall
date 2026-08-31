import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { safeInternalPath } from "../lib/safe-path";

// Verrouille la redirection ouverte que la page /login ouvrirait sans ce
// filtre : depuis le 31/08/2026 elle accepte un `callbackUrl` pour ramener
// l'utilisateur là où il allait. Le paramètre vient de l'URL, donc de
// n'importe qui — un lien envoyé par email ferait de brief-ai.fr un tremplin
// vers un site tiers, avec le crédit de confiance du domaine.

describe("safeInternalPath", () => {
  test("laisse passer un chemin interne, query et ancre comprises", () => {
    assert.equal(safeInternalPath("/feedback/5beb44e3", "/brief"), "/feedback/5beb44e3");
    assert.equal(safeInternalPath("/dashboard?commercial=42", "/brief"), "/dashboard?commercial=42");
    assert.equal(safeInternalPath("/team#roster", "/brief"), "/team#roster");
  });

  test("refuse tout ce qui sort du domaine", () => {
    for (const value of [
      "https://exemple.test",
      "http://exemple.test",
      "//exemple.test", // relative au protocole
      "/\\exemple.test", // la barre inversée est normalisée en barre
      "javascript:alert(1)",
      "exemple.test",
      "",
      "   ",
    ]) {
      assert.equal(safeInternalPath(value, "/brief"), "/brief", `« ${value} » doit être refusé`);
    }
  });

  test("refuse ce qui n'est pas une chaîne", () => {
    // searchParams peut rendre un tableau quand le paramètre est répété.
    assert.equal(safeInternalPath(["/a", "/b"], "/brief"), "/brief");
    assert.equal(safeInternalPath(undefined, "/brief"), "/brief");
    assert.equal(safeInternalPath(null, "/brief"), "/brief");
  });
});
