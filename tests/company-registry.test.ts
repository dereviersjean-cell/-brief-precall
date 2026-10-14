import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeCompanyName, pickLeader, toRegistryCompany } from "../lib/company-registry";

// Fiche d'identité à l'inscription (14/10/2026) : on recopie le registre, sans
// IA. Ces tests verrouillent ce qu'on choisit d'afficher — jamais un
// commissaire aux comptes comme « dirigeant », jamais la date de naissance,
// et pas de fiche pour un homonyme.
describe("registre des entreprises", () => {
  test("le dirigeant est la personne à la tête, pas le commissaire aux comptes", () => {
    const leader = pickLeader([
      { type_dirigeant: "personne morale", denomination: "KPMG S.A", qualite: "Commissaire aux comptes titulaire" },
      { type_dirigeant: "personne physique", nom: "NIOX-CHATEAU", prenoms: "STANISLAS MARIE", qualite: "Président de SAS" },
    ]);
    assert.deepEqual(leader, { name: "Stanislas Niox-Chateau", role: "Président de SAS" });
  });

  test("une société présidente à défaut de personne", () => {
    const leader = pickLeader([{ type_dirigeant: "personne morale", denomination: "IDWINE", qualite: "Président de SAS" }]);
    assert.deepEqual(leader, { name: "Idwine", role: "Président de SAS" });
  });

  test("fiche : arrondissement de Paris, effectif lisible, pas de date de naissance", () => {
    const card = toRegistryCompany({
      nom_complet: "ARVEST WINE",
      siren: "988726949",
      date_creation: "2025-06-27",
      tranche_effectif_salarie: "NN",
      siege: { libelle_commune: "PARIS", code_postal: "75011" },
      dirigeants: [{ type_dirigeant: "personne physique", nom: "DUPONT", prenoms: "JEAN", qualite: "Gérant" }],
    });
    assert.equal(card?.city, "Paris 11e");
    assert.equal(card?.headcount, "Pas de salarié déclaré");
    assert.equal(card?.leader, "Jean Dupont");
    assert.equal(JSON.stringify(card).includes("naissance"), false);
  });

  test("le nom saisi doit correspondre au nom au registre", () => {
    assert.equal(normalizeCompanyName("Arvest Wine"), normalizeCompanyName("ARVEST WINE"));
    assert.equal(normalizeCompanyName("Acme SAS"), normalizeCompanyName("ACME"));
    assert.notEqual(normalizeCompanyName("Arvest"), normalizeCompanyName("Arvest Wine"));
  });
});
