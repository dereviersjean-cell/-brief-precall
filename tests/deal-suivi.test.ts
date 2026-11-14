import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { suiviKind, suiviLevel, suiviReason } from "../lib/deal-suivi";
import type { DealProgress } from "../lib/deal-progress";

// Verrouille le tri de « Suivi des deals » : ce qui demande au manager
// d'intervenir, ce qui se surveille, ce qui avance sans lui.

const deal = (over: Partial<DealProgress>): DealProgress =>
  ({
    verdict: "progres",
    nextStep: { date: "2026-11-10", text: "Call de suivi", status: "a_jour" },
    focus: { status: "bonne_voie", action: "", detail: null },
    ...over,
  }) as DealProgress;

describe("deal-suivi", () => {
  test("un deal qui recule demande d'intervenir", () => {
    assert.equal(suiviLevel(deal({ verdict: "recul" })), "intervenir");
  });

  test("une suite datée passée sans call demande d'intervenir, et se dit telle quelle", () => {
    const d = deal({ verdict: "arret", nextStep: { date: "2026-07-15", text: "Envoyer le récap", status: "en_retard" } });
    assert.equal(suiviLevel(d), "intervenir");
    assert.equal(suiviReason(d, "autre"), "Engagement en retard : Envoyer le récap (prévu le 15 juillet)");
  });

  test("à relancer se surveille, en bonne voie avance seul", () => {
    assert.equal(suiviLevel(deal({ verdict: "arret", focus: { status: "relancer", action: "", detail: null } } as Partial<DealProgress>)), "surveiller");
    assert.equal(suiviLevel(deal({})), "seul");
  });

  test("hors engagement en retard, la raison est celle du conseil au manager", () => {
    assert.equal(suiviReason(deal({ verdict: "recul" }), "Le décideur n'a jamais été rencontré."), "Le décideur n'a jamais été rencontré.");
  });
});

describe("suiviKind : ce qui remonte au manager", () => {
  const base = { verdict: "progres", nextStep: { date: null, text: null, status: "a_jour" }, idleDays: 3, missingForStage: [], steps: [{}, {}], hubspot: null } as unknown as DealProgress;
  test("un deal qui recule est une dégradation", () => {
    assert.equal(suiviKind({ ...base, verdict: "recul" }), "degradation");
  });
  test("une suite passée est un engagement non tenu", () => {
    assert.equal(suiviKind({ ...base, nextStep: { date: "2026-11-01", text: "Envoyer", status: "en_retard" } }), "engagement");
  });
  test("une information requise manquante après deux rendez-vous est un blocage", () => {
    assert.equal(suiviKind({ ...base, missingForStage: ["Budget"] }), "blocage");
    assert.equal(suiviKind({ ...base, missingForStage: ["Budget"], steps: [{}] as never }), null);
  });
  test("sans échange depuis 14 jours (7 en proposition), le deal est endormi", () => {
    assert.equal(suiviKind({ ...base, idleDays: 15 }), "endormi");
    assert.equal(suiviKind({ ...base, idleDays: 8 }), null);
    assert.equal(suiviKind({ ...base, idleDays: 8, hubspot: { stage: "Contract Sent" } as never }), "endormi");
  });
  test("au-delà de 60 jours, une alerte n'est plus d'actualité : endormi", () => {
    assert.equal(suiviKind({ ...base, verdict: "recul", idleDays: 100 }), "endormi");
  });
});
