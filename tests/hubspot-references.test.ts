import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildReference, companySize, formatAmount, humanIndustry } from "../lib/crm/hubspot-references";

// Le 25/11/2026, l'import HubSpot a rendu 500 lignes « Secteur et taille non
// renseignés » : un deal gagné ne porte presque rien (sur le portail
// d'Oliverlist, 5 montants sur 1 451, aucune description). Tout ce qui est
// utile est sur l'entreprise associée.

const deal = { id: "1", dealname: "Utelys", amount: null, closedate: "2021-10-01T12:00:00Z" };
const utelys = {
  name: "Utelys",
  industry: "HOSPITALITY",
  numberofemployees: "5",
  city: "Toulouse",
  country: "France",
  description: "Utelys conçoit des guest apps sur-mesure pour les hôtels.",
  annualrevenue: null,
};

describe("humanIndustry", () => {
  test("rend lisible l'énumération HubSpot", () => {
    assert.equal(humanIndustry("HOSPITALITY"), "Hospitality");
    assert.equal(humanIndustry("COMPUTER_SOFTWARE"), "Computer software");
  });

  test("le vide reste vide", () => {
    assert.equal(humanIndustry(null), null);
    assert.equal(humanIndustry("  "), null);
  });
});

describe("companySize", () => {
  test("un effectif numérique s'accorde", () => {
    assert.equal(companySize("5"), "5 salariés");
    assert.equal(companySize("1"), "1 salarié");
  });

  test("une tranche écrite à la main passe telle quelle", () => {
    assert.equal(companySize("11-50"), "11-50");
  });

  test("le vide et le zéro ne disent rien", () => {
    assert.equal(companySize(null), null);
    assert.equal(companySize("0"), "0");
  });
});

describe("formatAmount", () => {
  test("un montant devient une somme en euros", () => {
    assert.match(formatAmount("12000") ?? "", /12\s?000/);
  });

  test("absent, vide ou nul : rien plutôt que « 0 € »", () => {
    assert.equal(formatAmount(null), null);
    assert.equal(formatAmount(""), null);
    assert.equal(formatAmount("0"), null);
    assert.equal(formatAmount("n/a"), null);
  });
});

describe("buildReference", () => {
  test("l'entreprise liée fournit secteur, taille et texte", () => {
    const ref = buildReference(deal, utelys);
    assert.equal(ref.client_name, "Utelys");
    assert.equal(ref.sector, "Hospitality");
    assert.equal(ref.company_size, "5 salariés");
    assert.equal(ref.source, "hubspot");
    assert.equal(
      ref.raw_text,
      "Utelys conçoit des guest apps sur-mesure pour les hôtels. — Secteur : Hospitality — Taille : 5 salariés — Localisation : Toulouse, France — Signé le : 2021-10-01"
    );
  });

  test("sans entreprise liée, on garde le nom du deal et la date", () => {
    const ref = buildReference(deal, null);
    assert.equal(ref.client_name, "Utelys");
    assert.equal(ref.sector, null);
    assert.equal(ref.company_size, null);
    assert.equal(ref.raw_text, "Signé le : 2021-10-01");
  });

  test("le nom de l'entreprise prime sur celui du deal", () => {
    const ref = buildReference({ ...deal, dealname: "Renouvellement 2026" }, { ...utelys, name: "Utelys SAS" });
    assert.equal(ref.client_name, "Utelys SAS");
  });

  test("un montant, quand il existe, part dans result et dans le texte", () => {
    const ref = buildReference({ ...deal, amount: "12000" }, utelys);
    assert.ok(ref.result);
    assert.match(ref.raw_text ?? "", /Montant :/);
  });

  test("une référence sans rien du tout ne fabrique pas un texte vide", () => {
    const ref = buildReference({ id: "9", dealname: null, amount: null, closedate: null }, null);
    assert.equal(ref.raw_text, null);
    assert.equal(ref.client_name, null);
  });
});
