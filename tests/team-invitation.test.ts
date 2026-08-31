import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isPendingInvitation } from "../lib/team-invitation";

// Verrouille le cul-de-sac du 31 août 2026 : un manager invite un commercial,
// l'email d'invitation échoue en silence, et il n'a plus aucune issue — le
// compte existe donc il ne peut pas réinviter, et rien ne lui permet de
// relancer. Les deux boutons qui réparent ça n'apparaissent que sur une
// invitation en attente : cette définition décide de leur affichage ET de ce
// que le serveur accepte. Si les deux divergent, on retrouve un bouton qui ne
// marche pas.

describe("isPendingInvitation", () => {
  test("en attente : invité, jamais connecté", () => {
    assert.equal(
      isPendingInvitation({ invited_at: "2026-08-31T14:58:39Z", has_logged_in: false }),
      true
    );
  });

  test("plus en attente dès la première connexion", () => {
    assert.equal(
      isPendingInvitation({ invited_at: "2026-08-31T14:58:39Z", has_logged_in: true }),
      false
    );
  });

  test("un compte jamais invité n'est pas une invitation en attente", () => {
    // Sinon on proposerait de « renvoyer » une invitation qui n'a jamais existé.
    assert.equal(isPendingInvitation({ invited_at: null, has_logged_in: false }), false);
    assert.equal(isPendingInvitation({ invited_at: null, has_logged_in: true }), false);
  });
});
