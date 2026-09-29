import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { firstNameFromEmail } from "../lib/email-address";

// Le prénom du destinataire de l'email de suivi vient de son adresse : le
// transcript n'a souvent aucun nom, et le modèle en inventait un
// (« Guillaume » pour william.bouzemarene@, 29/09/2026).
describe("firstNameFromEmail", () => {
  test("prenom.nom et prenom_nom", () => {
    assert.equal(firstNameFromEmail("william.bouzemarene@best-energy-control.fr"), "William");
    assert.equal(firstNameFromEmail("claire_martin@exemple.fr"), "Claire");
  });

  test("prénom composé", () => {
    assert.equal(firstNameFromEmail("jean-francois.dupont@exemple.fr"), "Jean-Francois");
  });

  test("rien quand l'adresse ne commence pas par un prénom", () => {
    assert.equal(firstNameFromEmail("a.ravachol@velbruncapital.fr"), null);
    assert.equal(firstNameFromEmail("claire@chaletdespraz.com"), null);
    assert.equal(firstNameFromEmail("contact.paris@exemple.fr"), null);
  });
});
