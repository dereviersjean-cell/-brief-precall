import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseTranscript } from "../lib/transcript-import";
import { computeCallInteractionMetrics } from "../lib/call-analytics";

// Import manuel de transcript (banc d'essai) et métriques d'interaction.
// Deux bugs réels sont verrouillés ici, tous deux trouvés en confrontant la
// sortie à un vrai call.

describe("parseTranscript — format horodaté « 00:45 Nom: texte »", () => {
  const transcript = [
    "00:45 Zénaide Jouenne: Bonjour.",
    "00:46 Dorian Monaco: Bonjour Zénaïde.",
    "Bonne santé, comment allez-vous ?",
    "00:51 Zénaide Jouenne: Très bien, merci.",
  ].join("\n");

  test("ne prend pas l'horodatage pour le nom du locuteur", () => {
    // Le bug : le parseur coupait au premier « : », donc celui de
    // l'horodatage, et retenait « 00 » comme locuteur. Tout le transcript
    // s'effondrait sur deux ou trois faux interlocuteurs.
    const parsed = parseTranscript(transcript);
    const speakers = Object.keys(parsed.speakerNames);
    assert.deepEqual(speakers.sort(), ["Dorian Monaco", "Zénaide Jouenne"]);
    assert.ok(!speakers.includes("00"), "« 00 » ne doit jamais être un locuteur");
  });

  test("rattache une ligne de continuation à la prise de parole en cours", () => {
    const parsed = parseTranscript(transcript);
    const dorian = parsed.transcriptJson?.turns.find((t) => t.speaker_id === "Dorian Monaco");
    assert.ok(dorian, "le tour de Dorian existe");
    assert.match(dorian.text, /comment allez-vous/, "la ligne sans horodatage lui est rattachée");
  });

  test("détecte le format et la précision des horodatages", () => {
    const parsed = parseTranscript(transcript);
    assert.equal(parsed.format, "timestamped");
    // Seuls les DÉBUTS sont connus : la patience ne doit pas être mesurée sur
    // ce format, les silences étant refermés par construction.
    assert.equal(parsed.timingPrecision, "coarse");
  });

  test("un texte sans horodatage ne produit aucun timing inventé", () => {
    const parsed = parseTranscript("Hubert : Bonjour.\nProspect : Ça coûte combien ?");
    assert.equal(parsed.timingPrecision, "none");
    assert.equal(parsed.transcriptJson, null, "pas de durées fabriquées");
    assert.equal(parsed.durationSeconds, null);
  });
});

describe("computeCallInteractionMetrics", () => {
  const turns = Array.from({ length: 6 }, (_, i) => ({
    speaker_id: i % 2 === 0 ? "Hubert" : "Claire",
    speaker_name_raw: null,
    start_ms: i * 10_000,
    end_ms: i * 10_000 + 5_000,
    text: i % 2 === 0 ? "Et concrètement, ça vous coûte quoi ?" : "On perd des deals.",
  }));
  const transcriptJson = { turns, total_duration_ms: 60_000 };

  test("ne produit AUCUNE métrique quand le commercial n'est pas identifié", () => {
    // Le bug : les compteurs du commercial sortaient à zéro au lieu d'être
    // absents. Persistés, ces zéros tiraient les moyennes d'équipe vers le bas
    // comme s'il s'agissait d'une contre-performance réelle.
    const metrics = computeCallInteractionMetrics(transcriptJson, {}, "Quelqu'un d'autre");
    assert.equal(metrics, null);
  });

  test("calcule les métriques quand le commercial est identifié", () => {
    const metrics = computeCallInteractionMetrics(transcriptJson, {}, "Hubert");
    assert.ok(metrics, "métriques produites");
    assert.equal(metrics.talk_ratio_pct, 50, "trois tours chacun, durées égales");
    assert.equal(metrics.commercial_questions_count, 3);
    assert.ok(metrics.interactivity_score > 0);
  });

  test("ignore un transcript trop pauvre pour conclure", () => {
    const sparse = { turns: turns.slice(0, 3), total_duration_ms: 30_000 };
    assert.equal(computeCallInteractionMetrics(sparse, {}, "Hubert"), null);
  });

  test("la patience n'est pas mesurée quand les fins de parole sont déduites", () => {
    const metrics = computeCallInteractionMetrics(transcriptJson, {}, "Hubert", { measurePatience: false });
    assert.ok(metrics);
    assert.equal(metrics.patience_ms, null);
  });
});
