import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hostMatchesCompanyName, isPublicHostname } from "../lib/company-logo";

// Recherche de logo : le serveur n'interroge que des sites publics, et
// n'affiche jamais le logo d'une autre entreprise que celle du rendez-vous.
describe("isPublicHostname", () => {
  test("accepte un domaine ordinaire", () => {
    assert.equal(isPublicHostname("scutum.fr"), true);
    assert.equal(isPublicHostname("best-energy-control.fr"), true);
  });
  test("refuse IP, localhost et noms internes", () => {
    assert.equal(isPublicHostname("169.254.169.254"), false);
    assert.equal(isPublicHostname("localhost"), false);
    assert.equal(isPublicHostname("db.internal"), false);
    assert.equal(isPublicHostname("exemple"), false);
  });
});

describe("hostMatchesCompanyName", () => {
  test("le site porte le nom de l'entreprise", () => {
    assert.equal(hostMatchesCompanyName("scutum.fr", "Scutum"), true);
    assert.equal(hostMatchesCompanyName("scutum-na.com", "Scutum North America"), true);
    assert.equal(hostMatchesCompanyName("bewtr.com", "BE WTR"), true);
    assert.equal(hostMatchesCompanyName("best-energy-control.fr", "Best Energy Control"), true);
  });
  test("annuaires, réseaux sociaux et homonymes écartés", () => {
    assert.equal(hostMatchesCompanyName("societe.com", "Scutum"), false);
    assert.equal(hostMatchesCompanyName("linkedin.com", "Scutum"), false);
    assert.equal(hostMatchesCompanyName("groupe-france.fr", "Groupe France"), false);
  });
});
