import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  billingStatusFromStripeStatus,
  shouldActivateOnPaymentSucceeded,
  canTransitionQuote,
} from "../lib/billing-rules";

// Flux irréversibles : ces décisions touchent à l'argent et à l'accès, et
// s'exécutent dans des webhooks — sans utilisateur pour signaler l'erreur.
// Chaque test porte le nom du bug qu'il verrouille.

describe("billingStatusFromStripeStatus", () => {
  test("mappe les statuts Stripe connus", () => {
    assert.equal(billingStatusFromStripeStatus("trialing"), "trialing");
    assert.equal(billingStatusFromStripeStatus("active"), "active");
    assert.equal(billingStatusFromStripeStatus("past_due"), "grace_period");
    assert.equal(billingStatusFromStripeStatus("unpaid"), "grace_period");
    assert.equal(billingStatusFromStripeStatus("canceled"), "canceled");
    assert.equal(billingStatusFromStripeStatus("incomplete_expired"), "canceled");
  });

  test("un statut inconnu bloque au lieu d'ouvrir l'accès", () => {
    // Fail-closed : si Stripe introduit un statut demain, l'accès ne doit pas
    // s'ouvrir par défaut. Bloquer à tort se voit et se corrige ; laisser
    // passer ne se voit pas.
    assert.equal(billingStatusFromStripeStatus("incomplete"), "blocked");
    assert.equal(billingStatusFromStripeStatus("paused"), "blocked");
    assert.equal(billingStatusFromStripeStatus("un_statut_qui_n_existe_pas_encore"), "blocked");
  });
});

describe("shouldActivateOnPaymentSucceeded — bug #15", () => {
  test("n'active QUE depuis la période de grâce", () => {
    assert.equal(shouldActivateOnPaymentSucceeded("grace_period"), true);
  });

  test("n'écrase pas un essai en cours", () => {
    // Le bug exact : Stripe émet payment_succeeded pour la facture à 0 €
    // générée au démarrage d'un essai. Sans ce garde-fou, l'essai passait en
    // « active » dès le premier jour et le client était facturé trop tôt.
    assert.equal(shouldActivateOnPaymentSucceeded("trialing"), false);
  });

  test("ne réactive pas une organisation résiliée ou bloquée", () => {
    for (const status of ["active", "canceled", "blocked", "none"]) {
      assert.equal(shouldActivateOnPaymentSucceeded(status), false, `statut ${status}`);
    }
  });
});

describe("canTransitionQuote — acceptation de devis", () => {
  test("autorise la transition depuis les statuts ouverts", () => {
    for (const status of ["draft", "sent", "viewed"]) {
      assert.equal(canTransitionQuote(status), true, `statut ${status}`);
    }
  });

  test("refuse une seconde acceptation ou un refus après acceptation", () => {
    // La page de signature est accessible par simple lien : un rechargement ou
    // un double envoi ne doit pas produire un second signal win/loss, qui
    // fausserait les statistiques d'objections.
    assert.equal(canTransitionQuote("accepted"), false);
    assert.equal(canTransitionQuote("rejected"), false);
  });
});
