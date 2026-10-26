import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildHubspotNote, buildHubspotProperties, effectiveMapping } from "../lib/deal-memory-hubspot";
import type { DealOverview } from "../lib/deal-memory-schema";

// Verrouille ce que Brief écrit dans le HubSpot d'un client. Une dérive ici
// écrase les données d'un deal réel, ou y écrit ce qu'un autre call a dit.

const item = (text: string, callId: string) => ({ text, verbatim: text, startMs: null, callId, callAt: null });

const MEMORY: DealOverview["memory"] = {
  budget: [item("1 500 € par mois validé", "call-2"), item("Budget serré", "call-1")],
  prochaines_etapes: [item("Démo vendredi 14 h", "call-2"), item("Envoyer le devis", "call-2")],
  decideur: [item("Joseph, CEO", "call-1")],
};

describe("effectiveMapping", () => {
  test("la prochaine étape va par défaut dans hs_next_step, le réglage du client prime", () => {
    assert.deepEqual(effectiveMapping({ budget: "meddic_budget" }), { prochaines_etapes: "hs_next_step", budget: "meddic_budget" });
    assert.deepEqual(effectiveMapping({ prochaines_etapes: "" }), {});
  });

  test("un champ inconnu de la fiche est ignoré", () => {
    assert.deepEqual(effectiveMapping({ humeur: "mood" }), { prochaines_etapes: "hs_next_step" });
  });
});

describe("buildHubspotProperties", () => {
  test("chaque propriété prend ce qu'a dit le call le plus récent sur ce champ", () => {
    assert.deepEqual(
      buildHubspotProperties(MEMORY, { budget: "meddic_budget", prochaines_etapes: "hs_next_step", decideur: "meddic_economic_buyer" }),
      {
        meddic_budget: "1 500 € par mois validé",
        hs_next_step: "• Démo vendredi 14 h\n• Envoyer le devis",
        meddic_economic_buyer: "Joseph, CEO",
      }
    );
  });

  test("un champ dont aucun call n'a parlé n'est pas écrit (rien n'est effacé dans HubSpot)", () => {
    assert.deepEqual(buildHubspotProperties(MEMORY, { champion: "meddic_champion" }), {});
  });
});

describe("buildHubspotNote", () => {
  test("prochaines étapes en tête, puis points d'attention, texte échappé", () => {
    const html = buildHubspotNote({
      callTitle: "R2 <Velbrun>",
      callDay: "27 octobre 2026",
      content: {
        fields: { prochaines_etapes: [{ text: "Démo vendredi", verbatim: null, startMs: null }] },
        alerts: [{ rule: "concurrent_evoque", text: "Lemlist évalué", verbatim: null, startMs: null }],
      },
      badlyHandledObjections: ["Trop cher"],
    });
    assert.ok(html.startsWith("<p><strong>Fiche deal Brief · R2 &lt;Velbrun&gt; · 27 octobre 2026</strong></p><p><strong>Prochaines étapes</strong></p><ul><li>Démo vendredi</li></ul>"));
    assert.ok(html.includes("<li>Concurrent évoqué : Lemlist évalué</li><li>Objection mal traitée : Trop cher</li>"));
  });
});
