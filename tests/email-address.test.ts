import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail } from "../lib/email-address";

// Verrouille le cul-de-sac du 31 août 2026 : sur un call dont l'invitation ne
// portait aucun participant externe, l'email de suivi était rédigé, affiché,
// puis refusé à l'envoi faute de destinataire — sans aucun moyen d'en fournir
// un. Le destinataire est désormais saisi à la main, donc à valider : une
// adresse malformée partirait jusqu'à l'API Gmail, qui la refuse avec un
// message que l'utilisateur ne voit jamais.

describe("isValidEmail", () => {
  test("accepte les adresses réelles, y compris les formes moins courantes", () => {
    for (const value of [
      "thea@getrey-deom.fr",
      "jean.dereviers@oliverlist.com",
      "prenom+etiquette@sous.domaine.co.uk",
      "c@d.fr",
    ]) {
      assert.equal(isValidEmail(value), true, `« ${value} » doit passer`);
    }
  });

  test("refuse ce qui ne peut pas partir", () => {
    for (const value of [
      "",
      "ce contact", // le libellé affiché quand aucun contact n'est connu
      "thea", // début de saisie
      "thea@", // saisie interrompue
      "@getrey-deom.fr",
      "thea@localhost", // domaine sans point : Gmail le refuse
      "thea @getrey-deom.fr", // espace au milieu
      "thea@getrey deom.fr",
      "thea@@getrey-deom.fr",
      "thea@.fr",
      "thea@getrey-deom.",
    ]) {
      assert.equal(isValidEmail(value), false, `« ${value} » ne doit pas passer`);
    }
  });

  test("tolère les espaces autour : une adresse se colle plus qu'elle ne se tape", () => {
    assert.equal(isValidEmail("  thea@getrey-deom.fr  "), true);
    assert.equal(isValidEmail("\nthea@getrey-deom.fr\t"), true);
  });
});
