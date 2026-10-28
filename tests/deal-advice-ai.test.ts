import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildAdvicePrompt, parseAdvice } from "../lib/deal-advice-ai";
import { adviceFor } from "../lib/deal-advice";
import { coachingQuestions, managerTitle, managerWhy } from "../lib/deal-coaching";
import { buildDealProgress, type ProgressFiche } from "../lib/deal-progress";
import type { AiDealAdvice } from "../lib/deal-memory-schema";

// Verrouille le conseil rédigé par Haiku : une réponse incomplète est
// écartée (l'écran garde les conseils fixes), et l'écran choisit la relance
// ou les étapes selon l'état du deal au moment où on le regarde.

const RAW = JSON.stringify({
  next: { title: "Envoyer à Severin le récap des deux options", why: "Il doit défendre l'option 1.", steps: ["Rédige le récap.", "Envoie-le."] },
  relance: { title: "Relancer Severin", why: "Sa direction attend.", message: "Bonjour Severin, comme convenu…" },
  manager: { title: "Faire préciser à Guislain qui tranche", why: "Le décideur n'a jamais été vu.", questions: ["Qui tranche ?", "« Quand ? »"] },
});

const NOW = Date.parse("2026-10-27T10:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
const fiche = (callAt: string, advice: AiDealAdvice): ProgressFiche => ({
  dealId: "d",
  dealName: "Sarawak France",
  hubspot: null,
  callId: "c",
  callAt,
  callTitle: null,
  fields: { douleur: [{ text: "paiement", verbatim: null, startMs: null }] },
  alerts: [],
  nextQuestions: { rank: 2, questions: {}, advice },
});

describe("deal-advice-ai", () => {
  const advice = parseAdvice(RAW, "claude-haiku-5-5", "2026-10-28T00:00:00Z") as AiDealAdvice;

  test("la réponse est lue, les phrases au prospect et au commercial mises entre « »", () => {
    assert.equal(advice.next.steps.length, 2);
    assert.equal(advice.relance.message, "« Bonjour Severin, comme convenu… »");
    assert.deepEqual(advice.manager.questions, ["« Qui tranche ? »", "« Quand ? »"]);
  });

  test("un conseil à trous est écarté", () => {
    const partial = JSON.parse(RAW);
    partial.manager.questions = [];
    assert.equal(parseAdvice(JSON.stringify(partial), "m", "t"), null);
    assert.equal(parseAdvice("pas du JSON", "m", "t"), null);
  });

  test("le prompt porte les faits du deal", () => {
    const prompt = buildAdvicePrompt({
      dealName: "Sarawak France",
      commercialName: "Guislain",
      participants: ["Severin MICHEL"],
      rank: 4,
      callAt: "2026-07-07T16:00:00Z",
      known: { budget: [{ text: "1 500 € par mois", verbatim: null, startMs: null, level: "evoque" }] },
      commitments: [{ text: "Envoyer le récap", date: null }],
      objections: [{ objection: "Paiement sur facture", handlingQuality: "non_traitee" }],
      alerts: [],
      summary: null,
      nextPlan: null,
    });
    assert.match(prompt, /Budget \(évoqué\) : 1 500 € par mois/);
    assert.match(prompt, /Paiement sur facture — non traitée/);
    assert.match(prompt, /Severin MICHEL/);
  });

  test("deal récent : les étapes ; deal silencieux : le message de relance, avec le silence", () => {
    const recent = buildDealProgress([fiche(daysAgo(2), advice)], NOW)[0];
    assert.equal(adviceFor(recent).title, "Envoyer à Severin le récap des deux options");
    assert.deepEqual(adviceFor(recent).how, ["Rédige le récap.", "Envoie-le."]);

    const silent = buildDealProgress([fiche(daysAgo(40), advice)], NOW)[0];
    const a = adviceFor(silent);
    assert.equal(a.title, "Relancer Severin");
    assert.deepEqual(a.how, ["« Bonjour Severin, comme convenu… »"]);
    assert.match(a.why, /40 jours.*Sa direction attend\./);
    assert.equal(managerTitle(silent, "Guislain"), "Faire préciser à Guislain qui tranche");
    assert.match(managerWhy(silent), /Le décideur n'a jamais été vu\./);
    assert.equal(coachingQuestions(silent)[0].startsWith("« Où en es-tu avec Sarawak France"), true);
    assert.equal(coachingQuestions(silent).length, 3);
  });
});
