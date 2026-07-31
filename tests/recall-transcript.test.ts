import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { transcriptToText, buildTranscriptJson } from "../lib/recall";

// Ingestion des calls (webhook Recall). Un transcript mal lu contamine tout
// ce qui en découle : analyse, scores, objections, verbatims, analytics — et
// ça se voit des jours plus tard, sur des données déjà en base.

// Forme réelle d'un segment Recall, vérifiée contre de vrais téléchargements.
// Le locuteur est dans `participant`, PAS dans un champ `speaker`.
function segment(participantId: number, name: string | null, words: [string, number, number][]) {
  return {
    participant: { id: participantId, name },
    words: words.map(([text, start, end]) => ({
      text,
      start_timestamp: { relative: start },
      end_timestamp: { relative: end },
    })),
  };
}

describe("transcriptToText", () => {
  test("ne plante pas sur une entrée non conforme", () => {
    assert.equal(transcriptToText(null), "null");
    assert.equal(transcriptToText("déjà du texte"), "déjà du texte");
    assert.equal(transcriptToText([]), "");
  });

  test("ignore les segments sans mots plutôt que d'écrire des lignes vides", () => {
    const text = transcriptToText([segment(1, "Hubert", []), segment(2, "Claire", [["Bonjour", 0, 1]])]);
    assert.equal(text.split("\n").length, 1);
  });
});

describe("buildTranscriptJson — bug #1 (participant, pas speaker)", () => {
  test("fusionne les segments consécutifs d'un même locuteur en un tour", () => {
    // Recall découpe la parole ininterrompue d'un locuteur en plusieurs
    // segments (~27 % des segments d'un vrai échantillon). Sans fusion, le
    // transcript paraîtrait bien plus haché qu'une vraie conversation — et
    // toutes les métriques d'interaction en découleraient faussées.
    const json = buildTranscriptJson([
      segment(1, "Hubert", [["Bonjour", 0, 1]]),
      segment(1, "Hubert", [["comment", 1, 2]]),
      segment(2, "Claire", [["Très bien", 3, 4]]),
    ]);

    assert.equal(json.turns.length, 2, "deux tours, pas trois segments");
    assert.equal(json.turns[0].speaker_id, "1");
    assert.match(json.turns[0].text, /Bonjour.*comment/);
    assert.equal(json.turns[1].speaker_id, "2");
  });

  test("identifie le locuteur par participant.id et non par un champ speaker", () => {
    // Le bug d'origine : le code lisait `segment.speaker`, absent de la vraie
    // structure — tous les locuteurs s'affichaient « Unknown ».
    const json = buildTranscriptJson([segment(42, "Hubert de la Lance", [["Bonjour", 0, 1]])]);
    assert.equal(json.turns[0].speaker_id, "42");
    assert.equal(json.turns[0].speaker_name_raw, "Hubert de la Lance");
    assert.notEqual(json.turns[0].speaker_id, "unknown");
  });

  test("retombe sur un objet vide quand l'entrée n'est pas un tableau", () => {
    const json = buildTranscriptJson(null);
    assert.deepEqual(json, { turns: [], total_duration_ms: 0 });
  });

  test("les horodatages sont en millisecondes et croissants", () => {
    const json = buildTranscriptJson([
      segment(1, "Hubert", [["Bonjour", 0, 1.5]]),
      segment(2, "Claire", [["Oui", 2, 2.4]]),
    ]);
    assert.equal(json.turns[0].start_ms, 0);
    assert.ok(json.turns[1].start_ms >= json.turns[0].end_ms, "les tours ne se chevauchent pas");
    assert.ok(json.total_duration_ms > 0);
  });
});
