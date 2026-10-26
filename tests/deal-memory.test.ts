import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDealMemoryLines, shapeDealMemory } from "../lib/deal-memory";
import type { TranscriptLine } from "../lib/objection-classifier";

// Verrouille ce que la fiche deal a le droit d'affirmer : un élément sans
// phrase du transcript pour le justifier n'entre pas dans la fiche. Sans ce
// garde-fou, le modèle peut remplir « Budget » ou « Décideur » par déduction,
// et le manager lit une supposition comme un fait.

const LINES: TranscriptLine[] = [
  { text: "Katell Buisson: Qu'est-ce qui vous amène à regarder le sujet ?", startMs: 0, endMs: 4000 },
  { text: "Antoine Seifert: On perd deux jours par semaine à qualifier des leads à la main", startMs: 4000, endMs: 9000 },
  { text: "Antoine Seifert: On regarde aussi Lemlist pour ça", startMs: 9000, endMs: 12000 },
  { text: "Katell Buisson: Qui valide le budget de votre côté ?", startMs: 12000, endMs: 15000 },
  { text: "Antoine Seifert: Ce sera mon associé, il n'était pas dispo aujourd'hui", startMs: 15000, endMs: 20000 },
];

describe("shapeDealMemory", () => {
  test("garde un élément ancré et en extrait la phrase exacte", () => {
    const out = shapeDealMemory(
      { fields: { douleur: [{ text: "Deux jours par semaine perdus à qualifier", lines: [1, 1] }] }, alerts: [] },
      LINES
    );
    assert.deepEqual(out.fields.douleur, [
      { text: "Deux jours par semaine perdus à qualifier", verbatim: "On perd deux jours par semaine à qualifier des leads à la main", startMs: 4000 },
    ]);
  });

  test("écarte un élément sans numéro de ligne ou hors transcript", () => {
    const out = shapeDealMemory(
      {
        fields: {
          budget: [{ text: "Environ 500 € par mois", lines: null }],
          decideur: [{ text: "Le DAF", lines: [40, 41] }],
        },
        alerts: [],
      },
      LINES
    );
    assert.equal(out.fields.budget, undefined);
    assert.equal(out.fields.decideur, undefined);
  });

  test("ignore les champs inconnus", () => {
    const out = shapeDealMemory({ fields: { humeur: [{ text: "Enthousiaste", lines: [1, 1] }] }, alerts: [] }, LINES);
    assert.deepEqual(out.fields, {});
  });

  test("une alerte à citer sans phrase est écartée, une alerte d'absence est gardée", () => {
    const out = shapeDealMemory(
      {
        fields: {},
        alerts: [
          { rule: "concurrent_evoque", text: "Lemlist évalué en parallèle", lines: null },
          { rule: "prochaine_etape_non_datee", text: "Aucune date fixée pour la suite", lines: null },
        ],
      },
      LINES
    );
    assert.deepEqual(
      out.alerts.map((a) => a.rule),
      ["prochaine_etape_non_datee"]
    );
  });

  test("une seule alerte par règle, règle inconnue ignorée", () => {
    const out = shapeDealMemory(
      {
        fields: {},
        alerts: [
          { rule: "concurrent_evoque", text: "Lemlist évalué", lines: [2, 2] },
          { rule: "concurrent_evoque", text: "Encore Lemlist", lines: [2, 2] },
          { rule: "budget_serre", text: "Budget serré", lines: [1, 1] },
          { rule: "interlocuteur_manquant", text: "L'associé valide le budget et n'était pas là", lines: [4, 4] },
        ],
      },
      LINES
    );
    assert.deepEqual(
      out.alerts.map((a) => [a.rule, a.verbatim]),
      [
        ["concurrent_evoque", "On regarde aussi Lemlist pour ça"],
        ["interlocuteur_manquant", "Ce sera mon associé, il n'était pas dispo aujourd'hui"],
      ]
    );
  });

  test("une réponse hors contrat donne une fiche vide, pas une erreur", () => {
    assert.deepEqual(shapeDealMemory(null, LINES), { fields: {}, alerts: [] });
    assert.deepEqual(shapeDealMemory({ fields: "rien", alerts: "rien" }, LINES), { fields: {}, alerts: [] });
  });
});

describe("buildDealMemoryLines", () => {
  test("nomme les locuteurs des tours horodatés", () => {
    const lines = buildDealMemoryLines({
      transcript: "Unknown: ignoré",
      turns: [{ text: "Bonjour", speaker_id: "100", start_ms: 0, end_ms: 1000 } as { text: string; speaker_id: string }],
      speakerNames: { "100": "Katell Buisson" },
    });
    assert.deepEqual(lines, [{ text: "Katell Buisson: Bonjour", startMs: 0, endMs: 1000 }]);
  });

  test("retombe sur le texte à plat sans tours", () => {
    const lines = buildDealMemoryLines({ transcript: "A: un\n\nB: deux", turns: null, speakerNames: {} });
    assert.deepEqual(
      lines.map((l) => l.text),
      ["A: un", "B: deux"]
    );
  });
});

describe("buildDealMemoryLines — découpage des longues prises de parole", () => {
  test("un monologue devient plusieurs lignes, chacune nommée et positionnée dans le tour", () => {
    const sentence = "On cherche un prestataire pour la prospection depuis plusieurs mois maintenant.";
    const text = Array(6).fill(sentence).join(" ");
    const lines = buildDealMemoryLines({
      transcript: null,
      turns: [{ text, speaker_id: "1", start_ms: 0, end_ms: 60000 } as { text: string; speaker_id: string }],
      speakerNames: { "1": "Antoine Seifert" },
    });
    assert.ok(lines.length > 1);
    assert.ok(lines.every((l) => l.text.startsWith("Antoine Seifert: ") && l.text.length <= 220 + 17));
    assert.equal(lines[0].startMs, 0);
    assert.equal(lines[lines.length - 1].endMs, 60000);
  });
});
