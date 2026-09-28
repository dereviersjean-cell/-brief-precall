import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readEventParticipants } from "../lib/calendar-participants";

// Verrouille le trou du 28/09/2026 : le sync Recall ne lisait les
// participants qu'au format Google. Sur un agenda Outlook, l'utilisateur
// n'était jamais trouvé et chaque réunion Teams était écartée comme « non
// acceptée ». Les événements ci-dessous reprennent la forme de Microsoft
// Graph (celle que Recall transmet telle quelle dans `raw`).

const ME = "jean@oliverlist.com";

describe("readEventParticipants — Google", () => {
  test("lit la réponse de l'utilisateur et les invités, sans les salles", () => {
    const raw = {
      summary: "Découverte BE WTR",
      attendees: [
        { email: "Jean@Oliverlist.com", responseStatus: "accepted", self: true },
        { email: "martin@bewtr.com", responseStatus: "needsAction" },
        { email: "salle-3@resource.calendar.google.com", responseStatus: "accepted", resource: true },
      ],
    };
    assert.deepEqual(readEventParticipants(raw, ME, "google_calendar"), {
      emails: ["jean@oliverlist.com", "martin@bewtr.com"],
      userResponse: "accepted",
    });
  });

  test("« tentative » n'est pas une acceptation", () => {
    const raw = { attendees: [{ email: ME, responseStatus: "tentative", self: true }] };
    assert.equal(readEventParticipants(raw, ME).userResponse, "tentative");
  });
});

describe("readEventParticipants — Outlook (Microsoft Graph)", () => {
  test("invitation reçue d'un prospect : il est l'organisateur, absent d'attendees", () => {
    const raw = {
      subject: "Démo Brief",
      isOrganizer: false,
      responseStatus: { response: "accepted", time: "2026-09-27T10:00:00Z" },
      organizer: { emailAddress: { name: "Martin Namy", address: "Martin.Namy@scutum.fr" } },
      attendees: [
        { type: "required", status: { response: "none" }, emailAddress: { name: "Jean", address: ME } },
      ],
    };
    assert.deepEqual(readEventParticipants(raw, ME, "microsoft_outlook"), {
      emails: [ME, "martin.namy@scutum.fr"],
      userResponse: "accepted",
    });
  });

  test("réunion organisée par l'utilisateur : comptée comme acceptée", () => {
    const raw = {
      isOrganizer: true,
      responseStatus: { response: "organizer" },
      organizer: { emailAddress: { address: ME } },
      attendees: [
        { type: "required", status: { response: "none" }, emailAddress: { address: "thea@getrey-deom.fr" } },
        { type: "resource", status: { response: "accepted" }, emailAddress: { address: "salle@oliverlist.com" } },
      ],
    };
    assert.deepEqual(readEventParticipants(raw, ME, "microsoft_outlook"), {
      emails: ["thea@getrey-deom.fr", ME],
      userResponse: "accepted",
    });
  });

  test("invitation pas encore acceptée : écartée, et dit pourquoi", () => {
    const raw = {
      isOrganizer: false,
      responseStatus: { response: "notResponded" },
      organizer: { emailAddress: { address: "martin@bewtr.com" } },
      attendees: [{ type: "required", status: { response: "notResponded" }, emailAddress: { address: ME } }],
    };
    assert.equal(readEventParticipants(raw, ME, "microsoft_outlook").userResponse, "notResponded");
  });

  test("réponse absente au niveau de l'événement : repli sur la ligne de l'utilisateur", () => {
    const raw = {
      organizer: { emailAddress: { address: "martin@bewtr.com" } },
      attendees: [{ type: "required", status: { response: "accepted" }, emailAddress: { address: ME } }],
    };
    assert.equal(readEventParticipants(raw, ME, "microsoft_outlook").userResponse, "accepted");
  });

  test("format reconnu à sa forme quand Recall n'indique pas la plateforme", () => {
    const raw = {
      responseStatus: { response: "accepted" },
      organizer: { emailAddress: { address: "martin@bewtr.com" } },
      attendees: [],
    };
    assert.deepEqual(readEventParticipants(raw, ME), {
      emails: ["martin@bewtr.com"],
      userResponse: "accepted",
    });
  });
});

test("événement illisible : aucun participant, aucune réponse", () => {
  assert.deepEqual(readEventParticipants(null, ME), { emails: [], userResponse: null });
  assert.deepEqual(readEventParticipants({}, ME), { emails: [], userResponse: null });
});
