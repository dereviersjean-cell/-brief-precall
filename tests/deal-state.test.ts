import { test } from "node:test";
import assert from "node:assert/strict";
import { dealState } from "../lib/deal-progress";
import { guessCommitmentSide } from "../lib/deal-macro";

const base = { verdict: "progres" as const, nextStepStatus: "a_jour" as const, idleDays: 3, known: 4 };

test("un deal qui recule est en recul, même sans échange depuis longtemps", () => {
  assert.equal(dealState({ ...base, verdict: "recul", idleDays: 90 }), "recul");
});

test("sans échange depuis 30 jours : à l'arrêt", () => {
  assert.equal(dealState({ ...base, verdict: "arret", idleDays: 45 }), "arret");
});

test("suite passée, suite non datée ou 14 jours sans échange : à relancer", () => {
  assert.equal(dealState({ ...base, nextStepStatus: "en_retard" }), "relancer");
  assert.equal(dealState({ ...base, verdict: "arret", nextStepStatus: "sans_suite" }), "relancer");
  assert.equal(dealState({ ...base, verdict: "arret", idleDays: 20 }), "relancer");
});

test("trop peu d'informations confirmées : à qualifier plutôt qu'en progrès", () => {
  assert.equal(dealState({ ...base, known: 1 }), "qualifier");
  assert.equal(dealState(base), "progres");
});

test("le seuil d'inactivité de l'organisation décale « à l'arrêt »", () => {
  assert.equal(dealState({ ...base, verdict: "arret", idleDays: 45, inactivityDays: 30 }), "relancer");
  assert.equal(dealState({ ...base, verdict: "arret", idleDays: 60, inactivityDays: 30 }), "arret");
});

test("à qui revient un engagement, d'après son texte", () => {
  assert.equal(guessCommitmentSide("Hubert envoie lundi matin les deux propositions.", "Hubert", false), "nous");
  assert.equal(guessCommitmentSide("Envoyer le récapitulatif", "Hubert", false), "nous");
  assert.equal(guessCommitmentSide("Mickael présente l'offre à son directeur lundi", "Hubert", false), "prospect");
  assert.equal(guessCommitmentSide("Prospect : validation de la proposition lundi", "Hubert", false), "prospect");
  assert.equal(guessCommitmentSide("Démonstration avec Claire Morel mardi à 14h", "Jean", true), "nous");
});
