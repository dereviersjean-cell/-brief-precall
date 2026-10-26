import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { dealIdentityFor, normalizeCompanyName } from "../lib/deal-grouping";

// Verrouille le rattachement d'un call à un deal avant HubSpot. Une erreur ici
// mélange l'historique de deux prospects dans la même fiche, ou coupe un deal
// en deux et lui fait perdre sa mémoire d'un call à l'autre.

describe("normalizeCompanyName", () => {
  test("graphie, accents et forme juridique n'en font pas deux entreprises", () => {
    assert.equal(normalizeCompanyName("Vasco/Gamma"), "vasco gamma");
    assert.equal(normalizeCompanyName("VASCO GAMMA SAS"), "vasco gamma");
    assert.equal(normalizeCompanyName("Châlet des Prats"), "chalet des prats");
  });

  test("rien d'exploitable = null", () => {
    assert.equal(normalizeCompanyName("  "), null);
    assert.equal(normalizeCompanyName("SAS"), null);
    assert.equal(normalizeCompanyName(null), null);
  });
});

describe("dealIdentityFor", () => {
  test("le domaine d'une adresse professionnelle sert de repère", () => {
    assert.deepEqual(
      dealIdentityFor({ contactEmail: "a.ravachol@velbruncapital.fr", prospectCompany: "Velbrun", companyName: null, ownDomains: ["oliverlist.com"] }),
      { domain: "velbruncapital.fr", nameKey: "velbrun", name: "Velbrun" }
    );
  });

  test("une adresse personnelle ou interne ne donne pas de domaine", () => {
    assert.deepEqual(
      dealIdentityFor({ contactEmail: "bbenarrous@gmail.com", prospectCompany: "Family & Co", companyName: null, ownDomains: [] }),
      { domain: null, nameKey: "family co", name: "Family & Co" }
    );
    assert.equal(
      dealIdentityFor({ contactEmail: "jean@oliverlist.com", prospectCompany: null, companyName: null, ownDomains: ["oliverlist.com"] }),
      null
    );
  });

  test("l'entreprise du commercial n'est jamais celle du prospect", () => {
    assert.equal(
      dealIdentityFor({ contactEmail: null, prospectCompany: "Oliverlist", companyName: null, ownDomains: [], ownCompanyName: "Oliverlist" }),
      null
    );
    assert.deepEqual(
      dealIdentityFor({ contactEmail: null, prospectCompany: "OLIVERLIST", companyName: "Vasco", ownDomains: [], ownCompanyName: "Oliverlist" }),
      { domain: null, nameKey: "vasco", name: "Vasco" }
    );
  });

  test("ni domaine ni entreprise : pas de deal", () => {
    assert.equal(dealIdentityFor({ contactEmail: null, prospectCompany: null, companyName: "", ownDomains: [] }), null);
  });
});
