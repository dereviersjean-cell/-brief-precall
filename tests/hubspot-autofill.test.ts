import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  candidateProperties,
  coerceAutofillConfig,
  coerceAutofillValue,
  defaultAutofillMode,
  formatExample,
  pickExample,
  planAutofill,
  sameValue,
  validateLinks,
  type AutofillLink,
  type AutofillObject,
  type AutofillProperty,
} from "../lib/hubspot-autofill";

// Verrouille la mise à jour automatique de HubSpot : Brief n'écrit que ce
// qu'un passage du call confirme, au format de la propriété, ne remplace une
// saisie que si le manager l'a choisi, et ne fait jamais reculer ni clore un
// deal.

const prop = (name: string, extra: Partial<AutofillProperty> = {}): AutofillProperty => ({
  name, label: name, description: "", type: "string", fieldType: "text", options: [], readOnly: false, custom: true, ...extra,
});

const DEFS: Record<AutofillObject, AutofillProperty[]> = {
  deal: [
    prop("amount", { type: "number", custom: false }),
    prop("closedate", { type: "datetime", custom: false }),
    prop("dealstage", { type: "enumeration", custom: false }),
    prop("hs_next_step", { custom: false }),
    prop("douleur"),
    prop("decideur_rencontre", { type: "enumeration", options: [{ label: "Oui", value: "oui" }, { label: "Non", value: "non" }] }),
    prop("calc", { readOnly: true }),
  ],
  contact: [prop("jobtitle", { custom: false })],
  company: [prop("numberofemployees", { type: "number", custom: false })],
};

const link = (object: AutofillObject, property: string, extra: Partial<AutofillLink> = {}): AutofillLink => ({
  object, property, label: property, type: "string", what: "x", mode: "fill_if_empty", enabled: true, check: null, example: null, ...extra,
});

const STAGE = {
  stages: [
    { id: "s1", label: "Découverte", closed: false },
    { id: "s2", label: "Démonstration planifiée", closed: false },
    { id: "s3", label: "Proposition", closed: false },
    { id: "won", label: "Gagné", closed: true },
  ],
  currentStageId: "s2",
};

function plan(links: AutofillLink[], extracted: Record<string, unknown>, current: Record<string, string | null> = {}, extra: Partial<Parameters<typeof planAutofill>[0]> = {}) {
  return planAutofill({
    links,
    extracted: Object.fromEntries(Object.entries(extracted).map(([k, v]) => [k, { value: v, evidence: true }])),
    current,
    lastWritten: {},
    definitions: DEFS,
    unavailable: {},
    dealClosed: false,
    stage: STAGE,
    ...extra,
  });
}

describe("hubspot-autofill", () => {
  test("candidates : toutes les propriétés du client, les standard utiles, rien d'illisible ni en lecture seule", () => {
    const names = candidateProperties("deal", [...DEFS.deal, prop("hs_object_id", { custom: false }), prop("fichier", { fieldType: "file" }), prop("coord", { type: "object_coordinates" })]).map((p) => p.name);
    assert.deepEqual(names, ["amount", "closedate", "dealstage", "hs_next_step", "decideur_rencontre", "douleur"]);
  });

  test("date de clôture et étape : « à chaque call », sinon rien ne serait jamais écrit", () => {
    assert.equal(defaultAutofillMode("deal", "closedate"), "always");
    assert.equal(defaultAutofillMode("deal", "dealstage"), "always");
    assert.equal(defaultAutofillMode("deal", "hs_next_step"), "update_unless_edited");
    assert.equal(defaultAutofillMode("deal", "amount"), "fill_if_empty");
    assert.equal(defaultAutofillMode("company", "city"), "fill_if_empty");
  });

  test("une configuration abîmée ne passe pas", () => {
    assert.equal(coerceAutofillConfig(null), null);
    assert.equal(coerceAutofillConfig({ active: true }), null);
    const c = coerceAutofillConfig({ active: "oui", links: [link("deal", "douleur"), link("deal", "douleur"), { object: "ticket", property: "x", type: "string" }, { object: "deal", property: "y", type: "json" }] });
    assert.equal(c?.active, false);
    assert.equal(c?.links.length, 1);
  });

  test("à l'enregistrement, libellé et type viennent de HubSpot ; une propriété disparue ou en lecture seule est écartée", () => {
    const out = validateLinks([link("deal", "amount", { label: "faux", type: "string" }), link("deal", "calc"), link("deal", "absente"), link("deal", "douleur", { what: "" })], DEFS);
    assert.equal(out.length, 1);
    assert.equal(out[0].type, "number");
    assert.equal(out[0].check, "pilote votre prévision");
  });

  test("format : nombre, date, oui/non, liste — jamais d'à-peu-près", () => {
    const t = (type: AutofillLink["type"], options: { label: string; value: string }[] = [], multiple = false) => ({ type, options, multiple });
    assert.equal(coerceAutofillValue(t("number"), 7000).value, "7000");
    assert.equal(coerceAutofillValue(t("number"), "7 000,5").value, "7000.5");
    assert.equal(coerceAutofillValue(t("number"), "entre 5 et 10 k€").value, null);
    assert.equal(coerceAutofillValue(t("date"), "2026-12-15").value, "2026-12-15");
    assert.equal(coerceAutofillValue(t("datetime"), "2026-12-15").value, "2026-12-15T00:00:00.000Z");
    assert.equal(coerceAutofillValue(t("date"), "mi-décembre").value, null);
    assert.equal(coerceAutofillValue(t("date"), "2026-02-31").value, null);
    assert.equal(coerceAutofillValue(t("bool"), "Oui").value, "true");
    assert.equal(coerceAutofillValue(t("bool"), "peut-être").value, null);
    const opts = [{ label: "Décideur", value: "DECISION_MAKER" }, { label: "Champion", value: "CHAMPION" }];
    assert.equal(coerceAutofillValue(t("enumeration", opts), "décideur").value, "DECISION_MAKER");
    assert.equal(coerceAutofillValue(t("enumeration", opts), "Sponsor").reason, "Option inexistante dans HubSpot");
    assert.equal(coerceAutofillValue(t("enumeration", opts), ["Champion", "Décideur"]).value, null);
    assert.equal(coerceAutofillValue(t("enumeration", opts, true), ["Champion", "Décideur"]).value, "CHAMPION;DECISION_MAKER");
    assert.equal(coerceAutofillValue(t("string"), "  ").reason, "Pas dite dans le call");
  });

  test("sans passage du call qui la confirme, rien n'est écrit", () => {
    const p = planAutofill({ links: [link("deal", "douleur")], extracted: { "deal.douleur": { value: "Trop peu de rendez-vous", evidence: false } }, current: {}, lastWritten: {}, definitions: DEFS, unavailable: {}, dealClosed: false, stage: STAGE });
    assert.equal(p[0].action, "skip");
    assert.equal(p[0].reason, "Aucun passage du call ne la confirme");
    assert.equal(plan([link("deal", "douleur")], {})[0].reason, "Pas dite dans le call");
  });

  test("si elle est vide : une valeur déjà là n'est jamais remplacée", () => {
    const l = [link("deal", "amount", { type: "number" })];
    assert.equal(plan(l, { "deal.amount": 7000 }, { "deal.amount": "" })[0].action, "write");
    assert.equal(plan(l, { "deal.amount": 7000 }, { "deal.amount": "9000" })[0].reason, "Déjà remplie");
    assert.equal(plan(l, { "deal.amount": 7000 }, { "deal.amount": "7000.00" })[0].reason, "Déjà à jour");
  });

  test("sauf modifiée à la main : Brief ne remplace que ce qu'il a lui-même écrit", () => {
    const l = [link("deal", "hs_next_step", { mode: "update_unless_edited" })];
    const ex = { "deal.hs_next_step": "Démonstration mardi" };
    assert.equal(plan(l, ex, { "deal.hs_next_step": "Rappeler Paul" })[0].reason, "Modifiée à la main dans HubSpot");
    assert.equal(plan(l, ex, { "deal.hs_next_step": "Rappeler Paul" }, { lastWritten: { "deal.hs_next_step": "rappeler  paul" } })[0].action, "write");
  });

  test("même si elle est remplie : la date de clôture suit le call", () => {
    const l = [link("deal", "closedate", { type: "datetime", mode: "always" })];
    const p = plan(l, { "deal.closedate": "2026-12-15" }, { "deal.closedate": "2026-11-30T00:00:00Z" })[0];
    assert.equal(p.action, "write");
    assert.equal(p.value, "2026-12-15T00:00:00.000Z");
    assert.equal(plan(l, { "deal.closedate": "2026-12-15" }, { "deal.closedate": "2026-12-15T09:30:00Z" })[0].reason, "Déjà à jour");
  });

  test("étape du deal : en avant seulement, dans son pipeline, jamais vers une clôture", () => {
    const l = [link("deal", "dealstage", { type: "enumeration", mode: "always" })];
    const cur = { "deal.dealstage": "s2" };
    assert.equal(plan(l, { "deal.dealstage": "Proposition" }, cur)[0].value, "s3");
    assert.equal(plan(l, { "deal.dealstage": "Proposition" }, cur)[0].action, "write");
    assert.equal(plan(l, { "deal.dealstage": "Découverte" }, cur)[0].reason, "Brief ne fait jamais reculer un deal");
    assert.equal(plan(l, { "deal.dealstage": "Gagné" }, cur)[0].reason, "Brief ne clôt jamais un deal");
    assert.equal(plan(l, { "deal.dealstage": "Négociation" }, cur)[0].reason, "Étape absente du pipeline de ce deal");
    assert.equal(plan(l, { "deal.dealstage": "Proposition" }, cur, { stage: null })[0].action, "skip");
  });

  test("deal clos, objet absent, propriété changée : rien, avec la raison", () => {
    assert.equal(plan([link("deal", "douleur")], { "deal.douleur": "x" }, {}, { dealClosed: true })[0].reason, "Deal clos");
    assert.equal(plan([link("contact", "jobtitle")], { "contact.jobtitle": "DG" }, {}, { dealClosed: true })[0].action, "write");
    assert.equal(plan([link("company", "numberofemployees", { type: "number" })], { "company.numberofemployees": 120 }, {}, { unavailable: { company: "Reconnectez HubSpot" } })[0].reason, "Reconnectez HubSpot");
    assert.equal(plan([link("deal", "amount")], { "deal.amount": 7000 })[0].reason, "Le type de la propriété a changé depuis le réglage");
    assert.equal(plan([link("deal", "calc")], { "deal.calc": "x" })[0].reason, "Propriété en lecture seule");
    assert.equal(plan([link("deal", "douleur", { enabled: false })], { "deal.douleur": "x" }).length, 0);
  });

  test("exemples : lisibles, et le premier non vide", () => {
    assert.equal(formatExample("number", "7000", [], "amount").replace(/\s/g, " "), "7 000 €");
    assert.equal(formatExample("number", "120", [], "numberofemployees"), "120");
    assert.equal(formatExample("datetime", "2026-12-15T00:00:00Z", []), "15 décembre 2026");
    assert.equal(formatExample("enumeration", "non", DEFS.deal[5].options), "Non");
    assert.equal(pickExample({ property: "douleur", type: "string" }, [], [{ douleur: null }, { douleur: " " }, { douleur: "Pas assez de rendez-vous" }]), "Pas assez de rendez-vous");
    assert.equal(pickExample({ property: "douleur", type: "string" }, [], [{}]), null);
    assert.equal(sameValue("enumeration", "a;b", "B;A"), true);
  });
});

import { shapeExtraction, shapeProposal } from "../lib/hubspot-autofill-ai";

describe("hubspot-autofill-ai", () => {
  const candidates = { deal: candidateProperties("deal", DEFS.deal), contact: DEFS.contact, company: DEFS.company };

  test("proposition : rien d'inventé, et montant, date de clôture, étape, prochaine étape toujours proposés", () => {
    const links = shapeProposal(
      { links: [
        { object: "deal", property: "douleur", what: "Le problème exprimé par le prospect.", enabled: true, check: null },
        { object: "deal", property: "inventee", what: "x" },
        { object: "ticket", property: "douleur", what: "x" },
        { object: "company", property: "numberofemployees", what: "L'effectif annoncé", enabled: false, check: "Rarement dite dans un call" },
      ] },
      candidates
    );
    assert.deepEqual(links.map((l) => `${l.object}.${l.property}`), ["deal.amount", "deal.closedate", "deal.dealstage", "deal.hs_next_step", "deal.douleur", "company.numberofemployees"]);
    assert.equal(links[0].check, "pilote votre prévision");
    assert.equal(links[1].mode, "always");
    assert.equal(links[2].label, "Étape du deal");
    assert.equal(links[4].what, "Le problème exprimé par le prospect");
    assert.equal(links[5].enabled, false);
    assert.deepEqual(shapeProposal("n'importe quoi", { deal: [], contact: [], company: [] }), []);
  });

  test("extraction : une valeur hors liste est ignorée, une valeur sans passage valide n'est pas une preuve", () => {
    const links = [link("deal", "douleur"), link("deal", "amount", { type: "number" }), link("contact", "jobtitle", { enabled: false })];
    const out = shapeExtraction(
      { values: [
        { id: "deal.douleur", value: "Trop peu de rendez-vous", lines: [3, 4] },
        { id: "deal.amount", value: 7000, lines: [40, 41] },
        { id: "contact.jobtitle", value: "DG", lines: [1, 1] },
        { id: "deal.secret", value: "x", lines: [1, 1] },
      ] },
      links,
      10
    );
    assert.deepEqual(Object.keys(out), ["deal.douleur", "deal.amount"]);
    assert.equal(out["deal.douleur"].evidence, true);
    assert.equal(out["deal.amount"].evidence, false);
    assert.deepEqual(shapeExtraction(null, links, 10), {});
  });
});
