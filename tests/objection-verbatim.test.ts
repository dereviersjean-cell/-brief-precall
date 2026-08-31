import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveRange, type TranscriptLine } from "../lib/objection-classifier";

// Verrouille l'ancrage des verbatims d'objection au transcript réel.
//
// Le classifieur ne demande PAS au modèle de recopier la phrase du prospect :
// il lui demande des numéros de ligne, et c'est resolveRange qui va chercher
// le texte. C'est le seul rempart entre « le prospect a dit ceci » et « le
// modèle a inventé une phrase que Brief affiche entre guillemets ». Une
// dérive ici ne casse rien à l'écran — elle ment, et la règle « ne jamais
// afficher comme citation un texte non ancré » tombe en silence.

const LINES: TranscriptLine[] = [
  { text: "Jean: Bonjour, merci de nous recevoir aujourd'hui", startMs: 0, endMs: 4000 },
  { text: "Théa: Votre solution me paraît vraiment très chère", startMs: 4000, endMs: 9000 },
  { text: "Théa: On a déjà un outil interne qui fait à peu près ça", startMs: 9000, endMs: 14000 },
  { text: "Jean: Je comprends tout à fait votre position", startMs: 14000, endMs: 18000 },
  { text: "Théa: Et le budget est bouclé pour cette année", startMs: 18000, endMs: 23000 },
  { text: "Jean: Regardons ensemble le calendrier", startMs: 23000, endMs: 27000 },
];

describe("resolveRange — ancrage des verbatims", () => {
  test("rend le texte réel des lignes citées, avec leurs bornes temporelles", () => {
    const r = resolveRange([1, 2], LINES);
    assert.equal(r.verbatim, "Votre solution me paraît vraiment très chère On a déjà un outil interne qui fait à peu près ça");
    assert.equal(r.startMs, 4000);
    assert.equal(r.endMs, 14000);
    assert.equal(r.startIndex, 1);
    assert.equal(r.endIndex, 2);
  });

  test("retire le préfixe de locuteur, pas l'horodatage", () => {
    assert.equal(resolveRange([0, 0], LINES).verbatim, "Bonjour, merci de nous recevoir aujourd'hui");
    // « 00:45 Nom: texte » — le premier « : » est celui de l'heure, la ligne
    // doit rester intacte plutôt que de perdre son début.
    const horodate: TranscriptLine[] = [{ text: "00:45 Théa: c'est trop cher pour nous", startMs: 45000, endMs: 48000 }];
    assert.equal(resolveRange([0, 0], horodate).verbatim, "00:45 Théa: c'est trop cher pour nous");
  });

  test("REFUSE un numéro de ligne hors transcript — le modèle a inventé", () => {
    for (const range of [[0, 99], [42, 43], [-1, 2]]) {
      const r = resolveRange(range, LINES);
      assert.equal(r.verbatim, null, `${JSON.stringify(range)} doit être rejeté`);
      assert.equal(r.startMs, null);
      assert.equal(r.startIndex, null);
    }
  });

  test("refuse un intervalle inversé ou malformé", () => {
    for (const range of [[3, 1], [1], [1, 2, 3], "1-2", null, undefined, ["1", "2"], [1.5, NaN]]) {
      assert.equal(resolveRange(range, LINES).verbatim, null, `${JSON.stringify(range)} doit être rejeté`);
    }
  });

  test("borne la citation à 4 lignes, même si le modèle en demande davantage", () => {
    // Sans ce plafond, une « citation » pourrait avaler la moitié du call et
    // ne serait plus une citation.
    const r = resolveRange([0, 5], LINES);
    assert.equal(r.endIndex, 3);
    assert.equal(r.endMs, 18000);
    assert.ok(!r.verbatim!.includes("budget est bouclé"));
  });

  test("un fragment trop court n'est pas une citation", () => {
    const courtes: TranscriptLine[] = [{ text: "Théa: non", startMs: 0, endMs: 500 }];
    const r = resolveRange([0, 0], courtes);
    assert.equal(r.verbatim, null);
    // Les bornes temporelles restent, elles : la ligne existe bel et bien.
    assert.equal(r.startMs, 0);
  });
});
