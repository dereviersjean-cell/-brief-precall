import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildAdminConsentUrl,
  coerceMicrosoftAdminConsent,
  consentMailBody,
  isAdminConsentRequired,
  signConsentState,
  tenantFromIssuer,
  verifyConsentState,
} from "../lib/microsoft-admin-consent";

// Le consentement administrateur Microsoft est une étape d'installation chez
// le client : le manager envoie un lien, l'informatique du client l'ouvre
// dans son propre navigateur, parfois des jours plus tard. D'où un état signé
// plutôt qu'un cookie — et d'où ces tests, qui verrouillent ce qu'un cookie
// aurait garanti tout seul.

describe("buildAdminConsentUrl", () => {
  test("pointe le tenant du client et demande exactement les droits de la connexion", () => {
    const url = new URL(
      buildAdminConsentUrl({
        clientId: "beaef359-0000-0000-0000-000000000000",
        tenant: "72f988bf-86f1-41af-91ab-2d7cd011db47",
        redirectUri: "https://brief-ai.fr/api/microsoft/admin-consent/callback",
        state: "etat",
      })
    );
    assert.equal(url.host, "login.microsoftonline.com");
    assert.equal(url.pathname, "/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0/adminconsent");
    assert.equal(url.searchParams.get("client_id"), "beaef359-0000-0000-0000-000000000000");
    assert.equal(url.searchParams.get("state"), "etat");
    const scope = url.searchParams.get("scope") ?? "";
    assert.ok(scope.includes("https://graph.microsoft.com/Calendars.Read"));
    assert.ok(scope.includes("https://graph.microsoft.com/Mail.Send"));
    // Jamais .default : l'administrateur doit voir ce que l'email annonce.
    assert.ok(!scope.includes(".default"));
  });

  test("sans tenant connu, « organizations » et jamais « common »", () => {
    for (const tenant of [null, undefined, "", "   "]) {
      const url = new URL(
        buildAdminConsentUrl({ clientId: "c", tenant, redirectUri: "https://x.test/cb", state: "s" })
      );
      // « common » accepterait un compte personnel, qui n'a pas
      // d'administrateur : la page finirait en erreur.
      assert.equal(url.pathname, "/organizations/v2.0/adminconsent");
    }
  });
});

describe("tenantFromIssuer", () => {
  test("lit l'identifiant du tenant", () => {
    assert.equal(
      tenantFromIssuer("https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0"),
      "72f988bf-86f1-41af-91ab-2d7cd011db47"
    );
  });

  test("refuse ce qui n'est pas un émetteur Microsoft", () => {
    for (const value of [
      null,
      42,
      "",
      "https://login.microsoftonline.test/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0",
      "https://evil.test/https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0",
      "https://login.microsoftonline.com/common/v2.0",
    ]) {
      assert.equal(tenantFromIssuer(value), null, String(value));
    }
  });
});

describe("l'état signé porté par l'URL", () => {
  const secret = "secret-de-test";

  test("se relit lui-même", () => {
    const state = signConsentState({ organizationId: "org-1" }, secret);
    assert.deepEqual(verifyConsentState(state, secret), { organizationId: "org-1" });
  });

  test("refuse une signature d'un autre secret, ou une charge retouchée", () => {
    const state = signConsentState({ organizationId: "org-1" }, secret);
    assert.equal(verifyConsentState(state, "autre-secret"), null);

    // Changer l'organisation sans refaire la signature : c'est l'attaque que
    // l'état signé empêche — écrire un accord sur l'organisation d'un autre.
    const [, signature] = state.split(".");
    const forged = `${Buffer.from(JSON.stringify({ o: "org-2", t: Date.now() }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")}.${signature}`;
    assert.equal(verifyConsentState(forged, secret), null);
  });

  test("refuse l'absence, le vide et la forme cassée", () => {
    for (const value of [null, undefined, "", "sans-point", ".", ".abc"]) {
      assert.equal(verifyConsentState(value, secret), null, String(value));
    }
    assert.equal(verifyConsentState(signConsentState({ organizationId: "org-1" }, secret), ""), null);
  });

  test("vaut 30 jours, pas davantage, et ne vient pas du futur", () => {
    const now = Date.UTC(2026, 10, 24, 12, 0, 0);
    const state = signConsentState({ organizationId: "org-1", issuedAt: now }, secret);
    const day = 24 * 60 * 60 * 1000;
    assert.deepEqual(verifyConsentState(state, secret, now + 29 * day), { organizationId: "org-1" });
    assert.equal(verifyConsentState(state, secret, now + 31 * day), null);
    assert.equal(verifyConsentState(state, secret, now - 10 * 60 * 1000), null);
  });
});

describe("isAdminConsentRequired", () => {
  test("reconnaît les refus faute de consentement", () => {
    assert.equal(
      isAdminConsentRequired({
        error: "access_denied",
        errorDescription: "AADSTS65001: The user or administrator has not consented to use the application.",
      }),
      true
    );
    assert.equal(
      isAdminConsentRequired({ errorDescription: "AADSTS90094: The grant requires admin permission." }),
      true
    );
    assert.equal(isAdminConsentRequired({ error: "access_denied", errorSubcode: "consent_required" }), true);
  });

  test("ne confond pas avec les autres échecs", () => {
    assert.equal(isAdminConsentRequired({}), false);
    assert.equal(isAdminConsentRequired({ error: "OAuthCallback" }), false);
    assert.equal(
      isAdminConsentRequired({ errorDescription: "AADSTS50058: A silent sign-in request was sent." }),
      false
    );
  });
});

describe("coerceMicrosoftAdminConsent", () => {
  test("accepte un accord complet et tolère l'administrateur inconnu", () => {
    assert.deepEqual(
      coerceMicrosoftAdminConsent({ tenant: "t", grantedAt: "2026-11-24T10:00:00Z", grantedBy: "dsi@contoso.fr" }),
      { tenant: "t", grantedAt: "2026-11-24T10:00:00Z", grantedBy: "dsi@contoso.fr" }
    );
    assert.deepEqual(coerceMicrosoftAdminConsent({ tenant: "t", grantedAt: "2026-11-24T10:00:00Z" }), {
      tenant: "t",
      grantedAt: "2026-11-24T10:00:00Z",
      grantedBy: null,
    });
  });

  test("une forme inattendue vaut « pas d'accord », jamais une exception", () => {
    for (const value of [null, undefined, 3, "ok", {}, { tenant: "t" }, { grantedAt: "2026-11-24" }, { tenant: "  ", grantedAt: "x" }]) {
      assert.equal(coerceMicrosoftAdminConsent(value), null, JSON.stringify(value) ?? String(value));
    }
  });
});

describe("consentMailBody", () => {
  test("porte le lien, les droits nommés et ce qui n'est pas demandé", () => {
    const body = consentMailBody({ link: "https://login.microsoftonline.com/x/v2.0/adminconsent", senderName: "Marc" });
    assert.ok(body.includes("https://login.microsoftonline.com/x/v2.0/adminconsent"));
    assert.ok(body.includes("Calendars.Read"));
    assert.ok(body.includes("Mail.Send"));
    assert.ok(body.includes("Aucun droit de lecture de la messagerie"));
    assert.ok(body.includes("Entra ID"));
    assert.ok(body.trimEnd().endsWith("Marc"));
    // Pas de promesse qu'on ne peut pas montrer.
    assert.ok(!/certifi|ISO 27001|conformit/i.test(body));
  });
});
