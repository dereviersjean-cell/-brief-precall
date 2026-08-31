import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeConversationAnalytics } from "../lib/transcript-analytics";
import type { TranscriptJson } from "../lib/recall";

const S = 1000;

function turn(speaker: string, startS: number, endS: number, text = "bla") {
  return { speaker_id: speaker, speaker_name_raw: null, start_ms: startS * S, end_ms: endS * S, text };
}
function transcript(turns: TranscriptJson["turns"], totalS: number): TranscriptJson {
  return { turns, total_duration_ms: totalS * S };
}

// Un call de six tours : le commercial parle 3 × 10 s, le prospect 3 × 30 s.
const CALL = transcript(
  [
    turn("A", 0, 10, "Bonjour, comment ça va ?"),
    turn("B", 10, 40),
    turn("A", 40, 50, "Et sur le budget ?"),
    turn("B", 50, 80),
    turn("A", 80, 90),
    turn("B", 90, 120),
  ],
  120
);

describe("computeConversationAnalytics", () => {
  test("refuse de conclure sur un transcript trop pauvre", () => {
    // Moins de 5 tours = transcript Recall tronqué ou raté. Rendre des
    // métriques dessus reviendrait à afficher du bruit comme un diagnostic.
    const maigre = transcript([turn("A", 0, 5), turn("B", 5, 10)], 10);
    assert.equal(computeConversationAnalytics(maigre, {}, "Jean"), null);
  });

  test("identifie le commercial par son identifiant de locuteur quand il est connu", () => {
    const r = computeConversationAnalytics(CALL, {}, null, "A")!;
    assert.equal(r.speakers.find((s) => s.speaker_id === "A")!.is_commercial, true);
    assert.equal(r.speakers.find((s) => s.speaker_id === "B")!.is_commercial, false);
  });

  test("à défaut, par correspondance de nom sur les renommages", () => {
    const r = computeConversationAnalytics(CALL, { A: "Jean de Reviers" }, "Jean de Reviers")!;
    assert.equal(r.speakers.find((s) => s.speaker_id === "A")!.is_commercial, true);
  });

  test("SANS commercial identifié, le ratio est null — jamais une supposition", () => {
    // Le garde-fou central : se rabattre sur « celui qui parle le plus est le
    // commercial » donnerait un ratio inversé sur un call de découverte réussi,
    // où le prospect parle le plus. Un chiffre faux est pire qu'une absence.
    const r = computeConversationAnalytics(CALL, {}, null)!;
    assert.notEqual(r, null);
    assert.equal(r.commercial_prospect_ratio, null);
    assert.ok(r.speakers.every((s) => !s.is_commercial));
  });

  test("le ratio parle en pourcentages qui totalisent 100", () => {
    const r = computeConversationAnalytics(CALL, {}, null, "A")!;
    const ratio = r.commercial_prospect_ratio!;
    // 30 s sur 120 s de parole = 25 %
    assert.equal(ratio.commercial_pct, 25);
    assert.equal(ratio.prospect_pct, 75);
    assert.equal(ratio.commercial_pct + ratio.prospect_pct, 100);
  });

  test("la fenêtre saine est 35–55 % de temps de parole commercial", () => {
    const equilibre = transcript(
      [turn("A", 0, 20), turn("B", 20, 45), turn("A", 45, 65), turn("B", 65, 90), turn("A", 90, 100), turn("B", 100, 120)],
      120
    );
    const r = computeConversationAnalytics(equilibre, {}, null, "A")!;
    assert.equal(r.commercial_prospect_ratio!.is_healthy, true);
    // Le monologue commercial, lui, doit être signalé comme malsain.
    const monologue = transcript(
      [turn("A", 0, 100), turn("B", 100, 105), turn("A", 105, 110), turn("B", 110, 112), turn("A", 112, 120)],
      120
    );
    const r2 = computeConversationAnalytics(monologue, {}, null, "A")!;
    assert.equal(r2.commercial_prospect_ratio!.is_healthy, false);
  });

  test("compte les questions, les monologues et les échanges courts", () => {
    const r = computeConversationAnalytics(CALL, {}, null, "A")!;
    const a = r.speakers.find((s) => s.speaker_id === "A")!;
    const b = r.speakers.find((s) => s.speaker_id === "B")!;
    assert.equal(a.questions_count, 2); // les deux tours porteurs d'un « ? »
    assert.equal(a.monologues_count, 0); // 10 s, sous le seuil de 30 s
    assert.equal(b.monologues_count, 0); // 30 s pile : le seuil est strict
    // Un aller-retour se compte quand DEUX tours consécutifs de locuteurs
    // différents font chacun moins de 15 s. Ici le prospect parle 30 s à
    // chaque fois : aucun échange court.
    assert.equal(r.back_and_forth_count, 0);
  });

  test("classe les locuteurs du plus bavard au moins bavard", () => {
    const r = computeConversationAnalytics(CALL, {}, null, "A")!;
    assert.deepEqual(r.speakers.map((s) => s.speaker_id), ["B", "A"]);
  });
});
