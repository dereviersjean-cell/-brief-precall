import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { campaignDestination, looksAutomated, mailStepOf, parseCampaignClick } from "../lib/campaign-click";

// Les liens des mails Brief (séquenceur Apps Script, lienSite_) :
// https://brief-ai.fr/go?utm_source=email&utm_medium=prospection
//   &utm_campaign=c2&utm_content=mail1&r=1234
const LIEN = "https://brief-ai.fr/go?utm_source=email&utm_medium=prospection&utm_campaign=c2&utm_content=mail1&r=1234";

describe("parseCampaignClick", () => {
  test("lit le lien tel que le séquenceur le fabrique", () => {
    assert.deepEqual(parseCampaignClick(new URL(LIEN)), {
      contactRef: "1234",
      campaign: "c2",
      mailStep: 1,
      utmSource: "email",
      utmMedium: "prospection",
    });
  });

  test("un lien nu ne rend que des null, sans jeter", () => {
    assert.deepEqual(parseCampaignClick(new URL("https://brief-ai.fr/go")), {
      contactRef: null,
      campaign: null,
      mailStep: null,
      utmSource: null,
      utmMedium: null,
    });
  });

  test("la campagne est ramenée en minuscules : C2 et c2 sont la même", () => {
    assert.equal(parseCampaignClick(new URL("https://brief-ai.fr/go?utm_campaign=C2")).campaign, "c2");
  });

  test("une valeur démesurée est coupée : le lien est public", () => {
    const long = "x".repeat(5000);
    assert.equal(parseCampaignClick(new URL(`https://brief-ai.fr/go?r=${long}`)).contactRef?.length, 120);
  });

  test("un paramètre vide vaut absent", () => {
    assert.equal(parseCampaignClick(new URL("https://brief-ai.fr/go?r=&utm_campaign=%20")).contactRef, null);
    assert.equal(parseCampaignClick(new URL("https://brief-ai.fr/go?r=&utm_campaign=%20")).campaign, null);
  });
});

describe("mailStepOf", () => {
  test("mail1 à mail9", () => {
    assert.equal(mailStepOf("mail1"), 1);
    assert.equal(mailStepOf("mail3"), 3);
  });

  test("toute autre forme rend null plutôt qu'un chiffre inventé", () => {
    for (const v of [null, undefined, "", "mail", "mail0", "mail10", "1", "courriel2", "MAIL2"]) {
      assert.equal(mailStepOf(v), null, `pour ${String(v)}`);
    }
  });
});

describe("campaignDestination", () => {
  test("garde les utm pour l'outil d'audience, retire r", () => {
    const dest = new URL(campaignDestination(new URL(LIEN), "https://brief-ai.fr/"));
    assert.equal(dest.origin + dest.pathname, "https://brief-ai.fr/");
    assert.equal(dest.searchParams.get("utm_campaign"), "c2");
    assert.equal(dest.searchParams.get("utm_content"), "mail1");
    assert.equal(dest.searchParams.get("r"), null);
  });

  test("ne recopie rien d'autre : un lien forgé n'emporte pas ses paramètres", () => {
    const dest = new URL(campaignDestination(new URL("https://brief-ai.fr/go?next=//evil.example&r=1"), "https://brief-ai.fr/"));
    assert.equal(dest.searchParams.get("next"), null);
    assert.equal(dest.host, "brief-ai.fr");
  });

  test("la destination reste le site, quel que soit le lien d'entrée", () => {
    const dest = new URL(campaignDestination(new URL("https://getbriefai.com/go?utm_source=email"), "https://brief-ai.fr/"));
    assert.equal(dest.host, "brief-ai.fr");
    assert.equal(dest.searchParams.get("utm_source"), "email");
  });
});

describe("looksAutomated", () => {
  test("un vrai navigateur passe pour humain", () => {
    assert.equal(
      looksAutomated("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
      false
    );
    assert.equal(looksAutomated("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"), false);
  });

  test("les passerelles de messagerie et les robots sont marqués", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; proofpoint-urldefense)",
      "Mimecast Link Protection",
      "Microsoft Office Existence Discovery",
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Mozilla/5.0 (compatible; Googlebot/2.1)",
      "HeadlessChrome/120.0.0.0",
      "Slackbot-LinkExpanding 1.0",
    ]) {
      assert.equal(looksAutomated(ua), true, `pour ${ua}`);
    }
  });

  test("sans en-tête du tout : automatisé — aucun navigateur ne se présente ainsi", () => {
    assert.equal(looksAutomated(null), true);
    assert.equal(looksAutomated(""), true);
  });
});
