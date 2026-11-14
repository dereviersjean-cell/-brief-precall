import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { frenchTime, pickDealMeeting } from "../lib/next-meeting-time";

const m = (title: string, hour: string, commercial = true) => ({ title, startsAt: `2026-12-03T${hour}:00Z`, commercial });
const deal = { name: "CDA Jobs", lastTitle: "[VISIO] Laëtitia x Oliverlist", ownNames: ["Oliverlist", "Hubert de la Lance"] };

describe("heure du prochain rendez-vous", () => {
  test("le rendez-vous dont le titre reprend celui du précédent", () => {
    const picked = pickDealMeeting([m("Point Sarawak", "09:00"), m("[VISIO] Laetitia x Oliverlist", "16:00")], deal);
    assert.equal(picked?.title, "[VISIO] Laetitia x Oliverlist");
  });

  test("le nom de sa propre entreprise ne compte pas comme un mot commun", () => {
    assert.equal(pickDealMeeting([m("Sarawak x Oliverlist", "09:00"), m("Peatch x Oliverlist", "11:00")], deal), null);
  });

  test("à défaut de titre reconnu, le seul rendez-vous commercial du jour", () => {
    assert.equal(pickDealMeeting([m("Déjeuner équipe", "11:00", false), m("Découverte prospect", "16:00")], deal)?.title, "Découverte prospect");
    assert.equal(pickDealMeeting([m("Appel A", "09:00"), m("Appel B", "16:00")], deal), null);
  });

  test("un deal nommé par son domaine retrouve un titre écrit en deux mots", () => {
    const picked = pickDealMeeting([m("(Visio) PicsProd x Oliverlist", "13:00"), m("[VISIO] SEB' AUTOMATISME x Oliverlist", "13:30")], { ...deal, name: "sebautomatisme.com", lastTitle: null });
    assert.equal(picked?.title, "[VISIO] SEB' AUTOMATISME x Oliverlist");
  });

  test("l'heure s'écrit à la française, à Paris", () => {
    assert.equal(frenchTime("2026-12-03T16:00:00Z"), "17 h");
    assert.equal(frenchTime("2026-12-03T16:30:00Z"), "17 h 30");
  });
});
