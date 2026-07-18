import { marked, Renderer } from "marked";
import { getCrmTokens, saveCrmTokens } from "../db";

const REDIRECT_URI = "https://brief-precall.vercel.app/api/crm/hubspot/callback";
// deals.write and contacts.write added for module Distribution Flexible
// sous-étape C (write briefs/analyses into HubSpot). Notes and meetings are
// engagements, not their own scoped objects — there's no crm.objects.notes.*
// or crm.objects.meetings.* scope; access is gated by the parent object's
// own read/write scope instead (contacts.write covers notes/meeting writes
// on a contact, deals.write covers notes writes on a deal). IMPORTANT: this
// only affects NEW connections — every user who already connected HubSpot
// before this change has an access/refresh token pair scoped to the old,
// read-only list. Upgrading the requested scope here does not retroactively
// grant it to tokens already issued; existing users must reconnect (see
// hasHubSpotWriteAccess below, and /api/crm/hubspot/start which they can
// re-run) before writes will work for them.
const SCOPES =
  "oauth crm.objects.deals.read crm.objects.deals.write crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read";

export function getHubspotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

export type HubspotTokens = {
  access_token: string;
  refresh_token: string;
};

async function tokenRequest(body: Record<string, string>): Promise<HubspotTokens> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      ...body,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[hubspot] token request failed:", res.status, JSON.stringify(data));
    throw new Error(`HubSpot token request failed: ${data.message ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
  };
}

export async function exchangeHubspotCode(code: string): Promise<HubspotTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });
}

export async function refreshHubspotToken(refreshToken: string): Promise<HubspotTokens> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export type HubspotDeal = {
  id: string;
  dealname: string | null;
  amount: string | null;
  closedate: string | null;
};

export async function getWonDeals(accessToken: string): Promise<HubspotDeal[]> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
          ],
        },
      ],
      properties: ["dealname", "amount", "closedate", "hs_object_id"],
      limit: 100,
    }),
  });

  if (res.status === 401) throw new Error("getWonDeals auth failed: 401");

  const data = (await res.json()) as { results?: unknown[] };
  if (!res.ok) throw new Error(`getWonDeals failed: ${res.status}`);

  return (data.results ?? []).map((d) => {
    const deal = d as { id: string; properties: Record<string, string | null> };
    return {
      id: deal.id,
      dealname: deal.properties.dealname ?? null,
      amount: deal.properties.amount ?? null,
      closedate: deal.properties.closedate ?? null,
    };
  });
}

export type HubspotCompany = {
  id: string;
  name: string | null;
  industry: string | null;
  city: string | null;
  numberofemployees: string | null;
  annualrevenue: string | null;
};

export async function searchCompany(
  accessToken: string,
  companyName: string
): Promise<HubspotCompany[]> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/companies/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: companyName,
      limit: 5,
      properties: ["name", "industry", "city", "numberofemployees", "annualrevenue"],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`searchCompany auth failed: ${res.status}`);
  }
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: unknown[] };
  return (data.results ?? []).map((c) => {
    const company = c as { id: string; properties: Record<string, string | null> };
    return {
      id: company.id,
      name: company.properties.name ?? null,
      industry: company.properties.industry ?? null,
      city: company.properties.city ?? null,
      numberofemployees: company.properties.numberofemployees ?? null,
      annualrevenue: company.properties.annualrevenue ?? null,
    };
  });
}

// ─── Distribution Flexible, sous-étape C (HubSpot writes) ──────────────────
//
// Unlike getWonDeals/searchCompany above (which take an accessToken the
// caller already resolved), every function below takes userId directly and
// resolves/refreshes the token itself — that's what dispatchBriefPreCall /
// dispatchCallAnalysis (lib/notifications-dispatcher.ts) need, and it keeps
// the refresh-on-401-then-persist dance (already inlined once in
// app/api/crm/hubspot/import-references/route.ts) in one place instead of
// duplicated across ~8 call sites.

async function withHubspotAuth<T>(userId: string, fn: (accessToken: string) => Promise<T>): Promise<T> {
  const tokens = await getCrmTokens(userId, "hubspot");
  if (!tokens) throw new Error("HubSpot non connecté pour cet utilisateur.");

  try {
    return await fn(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401")) throw err;

    const fresh = await refreshHubspotToken(tokens.refresh_token);
    try {
      await saveCrmTokens(userId, "hubspot", fresh.access_token, fresh.refresh_token);
    } catch (saveErr) {
      console.warn("[hubspot] saveCrmTokens after refresh failed:", saveErr);
    }
    return await fn(fresh.access_token);
  }
}

// Mirrors hasCalendarWriteAccess (lib/google-calendar.ts) — same fail-safe
// contract (false on no token, no scope, or any network error), same
// "always refresh first" simplicity over try-then-refresh, since this is a
// cheap read-only introspection call, not a write worth optimizing away a
// round trip for.
export async function hasHubSpotWriteAccess(userId: string): Promise<boolean> {
  try {
    const tokens = await getCrmTokens(userId, "hubspot");
    if (!tokens) return false;

    const fresh = await refreshHubspotToken(tokens.refresh_token);
    saveCrmTokens(userId, "hubspot", fresh.access_token, fresh.refresh_token).catch((err) =>
      console.warn("[hasHubSpotWriteAccess] saveCrmTokens failed (non-blocking):", err)
    );

    const res = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${fresh.access_token}`);
    if (!res.ok) {
      console.error(`[hasHubSpotWriteAccess] tokeninfo request failed (${res.status}) for user ${userId}`);
      return false;
    }
    const data = (await res.json()) as { scopes?: string[] };
    return (data.scopes ?? []).includes("crm.objects.contacts.write");
  } catch (err) {
    console.error(`[hasHubSpotWriteAccess] failed for user ${userId}:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function resolveContactId(accessToken: string, email: string): Promise<string | null> {
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
      properties: ["email"],
      limit: 1,
    }),
  });
  if (res.status === 401) throw new Error("resolveContactId auth failed: 401");
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ id: string }> };
  return data.results?.[0]?.id ?? null;
}

export type HubspotContactMatch = { contactId: string };

export async function findHubSpotContactForEmail(
  userId: string,
  contactEmail: string
): Promise<HubspotContactMatch | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const id = await resolveContactId(accessToken, contactEmail);
    return id ? { contactId: id } : null;
  });
}

export type HubspotDealMatch = { dealId: string };

const CLOSED_DEAL_STAGES = new Set(["closedwon", "closedlost"]);

export async function findHubSpotDealForEmail(userId: string, contactEmail: string): Promise<HubspotDealMatch | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const contactId = await resolveContactId(accessToken, contactEmail);
    if (!contactId) return null;

    const assocRes = await fetch(`https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/deals`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (assocRes.status === 401) throw new Error("findHubSpotDealForEmail auth failed: 401");
    if (!assocRes.ok) return null;
    const assocData = (await assocRes.json()) as { results?: Array<{ toObjectId: string }> };
    const dealIds = (assocData.results ?? []).map((r) => r.toObjectId);
    if (dealIds.length === 0) return null;

    const dealsRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/batch/read", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })), properties: ["dealstage", "createdate"] }),
    });
    if (!dealsRes.ok) return null;
    const dealsData = (await dealsRes.json()) as {
      results?: Array<{ id: string; properties: { dealstage?: string | null; createdate?: string | null } }>;
    };
    const openDeals = (dealsData.results ?? [])
      .filter((d) => !CLOSED_DEAL_STAGES.has(d.properties.dealstage ?? ""))
      .sort((a, b) => (b.properties.createdate ?? "").localeCompare(a.properties.createdate ?? ""));

    return openDeals[0] ? { dealId: openDeals[0].id } : null;
  });
}

export type HubspotMeetingMatch = { meetingId: string; title: string | null; startTime: string | null };

type HubspotMeetingResult = {
  id: string;
  properties: { hs_meeting_title?: string | null; hs_meeting_start_time?: string | null };
};

export async function findHubSpotMeetingForEmail(
  userId: string,
  contactEmail: string,
  meetingStartAt?: string
): Promise<HubspotMeetingMatch | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const contactId = await resolveContactId(accessToken, contactEmail);
    if (!contactId) return null;

    const assocRes = await fetch(`https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/meetings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (assocRes.status === 401) throw new Error("findHubSpotMeetingForEmail auth failed: 401");
    if (!assocRes.ok) return null;
    const assocData = (await assocRes.json()) as { results?: Array<{ toObjectId: string }> };
    const meetingIds = (assocData.results ?? []).map((r) => r.toObjectId);
    if (meetingIds.length === 0) return null;

    const meetingsRes = await fetch("https://api.hubapi.com/crm/v3/objects/meetings/batch/read", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: meetingIds.map((id) => ({ id })),
        properties: ["hs_meeting_title", "hs_meeting_start_time"],
      }),
    });
    if (!meetingsRes.ok) return null;
    const meetingsData = (await meetingsRes.json()) as { results?: HubspotMeetingResult[] };
    const meetings = meetingsData.results ?? [];
    if (meetings.length === 0) return null;

    const targetTime = meetingStartAt ? new Date(meetingStartAt).getTime() : null;
    const timeOf = (m: HubspotMeetingResult): number | null =>
      m.properties.hs_meeting_start_time ? new Date(m.properties.hs_meeting_start_time).getTime() : null;

    const closest = meetings.reduce<HubspotMeetingResult | null>((best, m) => {
      if (!best) return m;
      const mTime = timeOf(m);
      const bestTime = timeOf(best);
      if (mTime === null) return best;
      if (bestTime === null) return m;
      if (targetTime !== null) {
        return Math.abs(mTime - targetTime) < Math.abs(bestTime - targetTime) ? m : best;
      }
      return mTime > bestTime ? m : best; // no target date — most recent wins
    }, null);

    if (!closest) return null;
    return {
      meetingId: closest.id,
      title: closest.properties.hs_meeting_title ?? null,
      startTime: closest.properties.hs_meeting_start_time ?? null,
    };
  });
}

// HubSpot notes/meeting bodies support basic HTML (h1-h3, p, ul, li, strong,
// em, a, hr) but NOT tables — unlike the email templates (lib/email.ts),
// which render a GFM table as a real <table>, this renderer flattens one
// into a bullet list (one <li> per row, "<header>: <cell>" pairs joined),
// since generateKeyPoints' output has been observed using a table for
// "Prochaines étapes" and it would otherwise show up as raw "| a | b |" text.
function createHubspotMarkdownRenderer(): Renderer {
  const renderer = new Renderer();
  renderer.table = (token) => {
    const headers = token.header.map((cell) => renderer.parser.parseInline(cell.tokens));
    const rows = token.rows
      .map(
        (row) =>
          `<li>${row
            .map((cell, i) => `<strong>${headers[i] ?? ""}:</strong> ${renderer.parser.parseInline(cell.tokens)}`)
            .join(" — ")}</li>`
      )
      .join("");
    return `<ul>${rows}</ul>`;
  };
  return renderer;
}

// Prepended to every note/meeting-body write — same "🤖 Généré par Brief"
// framing the spec asks for, linking back to the source brief/analysis.
export function htmlBodyForHubSpot(params: { markdown: string; linkUrl: string; linkLabel: string }): string {
  const contentHtml = marked.parse(params.markdown, { renderer: createHubspotMarkdownRenderer() }) as string;
  return `<p>🤖 <em>Généré par Brief</em> — <a href="${params.linkUrl}">${params.linkLabel}</a></p><hr>${contentHtml}`;
}

// Idempotence marker for the meeting-body append path — same detect-and-
// replace strategy as appendBriefToCalendarEvent (lib/google-calendar.ts):
// re-running (regenerated brief, retried dispatch) updates the existing
// section in place instead of stacking a new one below it.
const HUBSPOT_MEETING_BODY_MARKER = "───── 🤖 Généré par Brief ─────";

function mergeHubspotMeetingBody(existingBody: string, section: string): string {
  const idx = existingBody.indexOf(HUBSPOT_MEETING_BODY_MARKER);
  const before = (idx === -1 ? existingBody : existingBody.slice(0, idx)).trim();
  return before ? `${before}<br><br>${section}` : section;
}

// Replaces the spec'd createHubSpotNoteOnMeeting — HubSpot has no
// note-to-meeting association (confirmed live against
// crm/v4/associations/notes/meetings/labels, which returns an empty result
// set, and independently corroborated by HubSpot's own developer
// community). Notes can only attach to contacts/deals/companies/tickets.
// Writing straight into the meeting's own hs_meeting_body property (via
// crm.objects.contacts.write — meetings are engagements attached to
// contacts, not their own scoped object) achieves the actual goal — the
// brief anchored on that meeting, visible directly on its record — better than a
// disconnected note would have anyway.
export async function appendToHubSpotMeetingBody(userId: string, meetingId: string, htmlBody: string): Promise<void> {
  return withHubspotAuth(userId, async (accessToken) => {
    const getRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/meetings/${meetingId}?properties=hs_meeting_body`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (getRes.status === 401) throw new Error("appendToHubSpotMeetingBody auth failed: 401");
    if (!getRes.ok) throw new Error(`HubSpot meeting GET failed (${getRes.status}): ${await getRes.text()}`);
    const meeting = (await getRes.json()) as { properties?: { hs_meeting_body?: string | null } };

    const section = `${HUBSPOT_MEETING_BODY_MARKER}<br>${htmlBody}`;
    const newBody = mergeHubspotMeetingBody(meeting.properties?.hs_meeting_body ?? "", section);

    const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/meetings/${meetingId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { hs_meeting_body: newBody } }),
    });
    if (!patchRes.ok) throw new Error(`HubSpot meeting PATCH failed (${patchRes.status}): ${await patchRes.text()}`);
  });
}

// Idempotence for the deal/contact note tiers, per the spec's preferred
// option (a): an invisible HTML-comment marker embedded in hs_note_body,
// keyed by `uid` (the caller passes calendarEventId for briefs, callId for
// analyses — see lib/notifications-dispatcher.ts) — listing the target's
// existing notes and updating the one that already carries this marker
// instead of creating a duplicate on every regeneration/retry.
function buildHubspotNoteMarker(uid: string): string {
  return `<!-- brief-note-uid:${uid} -->`;
}

async function findExistingHubspotNoteId(
  accessToken: string,
  objectType: "deals" | "contacts",
  objectId: string,
  marker: string
): Promise<string | null> {
  const assocRes = await fetch(`https://api.hubapi.com/crm/v4/objects/${objectType}/${objectId}/associations/notes`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (assocRes.status === 401) throw new Error("findExistingHubspotNoteId auth failed: 401");
  if (!assocRes.ok) return null;
  const assocData = (await assocRes.json()) as { results?: Array<{ toObjectId: string }> };
  const noteIds = (assocData.results ?? []).map((r) => r.toObjectId);
  if (noteIds.length === 0) return null;

  const notesRes = await fetch("https://api.hubapi.com/crm/v3/objects/notes/batch/read", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: noteIds.map((id) => ({ id })), properties: ["hs_note_body"] }),
  });
  if (!notesRes.ok) return null;
  const notesData = (await notesRes.json()) as {
    results?: Array<{ id: string; properties: { hs_note_body?: string | null } }>;
  };
  const match = (notesData.results ?? []).find((n) => (n.properties.hs_note_body ?? "").includes(marker));
  return match?.id ?? null;
}

async function upsertHubspotNote(
  accessToken: string,
  htmlBody: string,
  uid: string,
  toObjectId: string,
  toObjectType: "deals" | "contacts",
  associationTypeId: number
): Promise<void> {
  const marker = buildHubspotNoteMarker(uid);
  const bodyWithMarker = `${htmlBody}${marker}`;

  const existingNoteId = await findExistingHubspotNoteId(accessToken, toObjectType, toObjectId, marker);
  if (existingNoteId) {
    const patchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/notes/${existingNoteId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { hs_note_body: bodyWithMarker } }),
    });
    if (!patchRes.ok) throw new Error(`HubSpot note update failed (${patchRes.status}): ${await patchRes.text()}`);
    return;
  }

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { hs_note_body: bodyWithMarker, hs_timestamp: new Date().toISOString() },
      associations: [{ to: { id: toObjectId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId }] }],
    }),
  });
  if (res.status === 401) throw new Error("upsertHubspotNote auth failed: 401");
  if (!res.ok) throw new Error(`HubSpot note creation failed (${res.status}): ${await res.text()}`);
}

// Association type IDs verified live against a real connected portal (GET
// crm/v4/associations/notes/{deals,contacts}/labels) — 214 and 202
// respectively — rather than assumed from memory/docs.
const NOTE_TO_DEAL_ASSOCIATION_TYPE_ID = 214;
const NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID = 202;

export async function createHubSpotNoteOnDeal(userId: string, dealId: string, htmlBody: string, uid: string): Promise<void> {
  return withHubspotAuth(userId, (accessToken) =>
    upsertHubspotNote(accessToken, htmlBody, uid, dealId, "deals", NOTE_TO_DEAL_ASSOCIATION_TYPE_ID)
  );
}

export async function createHubSpotNoteOnContact(userId: string, contactId: string, htmlBody: string, uid: string): Promise<void> {
  return withHubspotAuth(userId, (accessToken) =>
    upsertHubspotNote(accessToken, htmlBody, uid, contactId, "contacts", NOTE_TO_CONTACT_ASSOCIATION_TYPE_ID)
  );
}

export type HubspotCascadeResult = { target: "meeting" | "deal" | "contact" | "none"; id?: string };

// Orchestrates the meeting > deal > contact fallback. `uid` feeds the
// deal/contact tiers' idempotence marker (see upsertHubspotNote above) — the
// meeting tier doesn't need one since appendToHubSpotMeetingBody already
// replaces its own marked section in place regardless of caller identity.
export async function writeToHubSpotCascade(
  userId: string,
  contactEmail: string,
  htmlBody: string,
  uid: string,
  meetingStartAt?: string
): Promise<HubspotCascadeResult> {
  const meeting = await findHubSpotMeetingForEmail(userId, contactEmail, meetingStartAt).catch((err) => {
    console.warn(
      "[writeToHubSpotCascade] findHubSpotMeetingForEmail failed (falling back):",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (meeting) {
    try {
      await appendToHubSpotMeetingBody(userId, meeting.meetingId, htmlBody);
      return { target: "meeting", id: meeting.meetingId };
    } catch (err) {
      console.warn(
        "[writeToHubSpotCascade] appendToHubSpotMeetingBody failed (falling back):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const deal = await findHubSpotDealForEmail(userId, contactEmail).catch((err) => {
    console.warn(
      "[writeToHubSpotCascade] findHubSpotDealForEmail failed (falling back):",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (deal) {
    try {
      await createHubSpotNoteOnDeal(userId, deal.dealId, htmlBody, uid);
      return { target: "deal", id: deal.dealId };
    } catch (err) {
      console.warn(
        "[writeToHubSpotCascade] createHubSpotNoteOnDeal failed (falling back):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const contact = await findHubSpotContactForEmail(userId, contactEmail).catch((err) => {
    console.warn(
      "[writeToHubSpotCascade] findHubSpotContactForEmail failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (contact) {
    try {
      await createHubSpotNoteOnContact(userId, contact.contactId, htmlBody, uid);
      return { target: "contact", id: contact.contactId };
    } catch (err) {
      console.warn(
        "[writeToHubSpotCascade] createHubSpotNoteOnContact failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return { target: "none" };
}

// ─── Tasks (Brief <-> HubSpot task sync) ────────────────────────────────────
//
// Unlike notes/meeting-body writes above (content pushed into an existing
// engagement), this creates/updates/deletes first-class HubSpot Task
// objects (crm/v3/objects/tasks) so they show up in the rep's HubSpot task
// queue, not just as a note. Same crm.objects.contacts.* scopes already
// granted today cover this — HubSpot's Tasks API doesn't have its own scope.

// Per HubSpot's documented default association types (task -> contact = 204,
// contact -> task = 203) — NOT verified live against a real portal the way
// the note association IDs above were (no live HubSpot connection available
// while building this); confirm against a real create call before relying
// on it, and switch to a live-verified value if it turns out wrong.
const TASK_TO_CONTACT_ASSOCIATION_TYPE_ID = 204;

export type HubspotTaskStatus = "NOT_STARTED" | "COMPLETED";

// Returns the created task's id, or null if the contact can't be resolved
// (best-effort — callers treat a null return the same as a caught error:
// skip silently, task stays HubSpot-less rather than failing the whole
// dispatch).
export async function createHubSpotTask(
  userId: string,
  params: { contactEmail: string; title: string; description: string | null; dueAt: string }
): Promise<string | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const contactId = await resolveContactId(accessToken, params.contactEmail);
    if (!contactId) return null;

    const res = await fetch("https://api.hubapi.com/crm/v3/objects/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: {
          hs_task_subject: params.title,
          hs_task_body: params.description ?? "",
          hs_timestamp: new Date(params.dueAt).toISOString(),
          hs_task_status: "NOT_STARTED",
          hs_task_type: "TODO",
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: TASK_TO_CONTACT_ASSOCIATION_TYPE_ID }],
          },
        ],
      }),
    });
    if (res.status === 401) throw new Error("createHubSpotTask auth failed: 401");
    if (!res.ok) throw new Error(`HubSpot task creation failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { id: string };
    return data.id;
  });
}

export async function updateHubSpotTaskStatus(
  userId: string,
  hubspotTaskId: string,
  status: HubspotTaskStatus
): Promise<void> {
  return withHubspotAuth(userId, async (accessToken) => {
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/tasks/${hubspotTaskId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { hs_task_status: status } }),
    });
    if (res.status === 401) throw new Error("updateHubSpotTaskStatus auth failed: 401");
    // A task already deleted on the HubSpot side 404s here — treat that the
    // same as success rather than surfacing an error the caller can't act on.
    if (!res.ok && res.status !== 404) {
      throw new Error(`HubSpot task update failed (${res.status}): ${await res.text()}`);
    }
  });
}

export async function deleteHubSpotTask(userId: string, hubspotTaskId: string): Promise<void> {
  return withHubspotAuth(userId, async (accessToken) => {
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/tasks/${hubspotTaskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) throw new Error("deleteHubSpotTask auth failed: 401");
    if (!res.ok && res.status !== 404) {
      throw new Error(`HubSpot task delete failed (${res.status}): ${await res.text()}`);
    }
  });
}

export type HubspotTaskStatusResult = { id: string; status: string | null };

// Batched status check for the polling cron (lib/inngest-functions.ts) —
// one call per user covers every Brief task linked to a HubSpot task id,
// rather than one round trip per task. Ids missing from the response were
// deleted on the HubSpot side (batch/read silently omits unknown ids rather
// than erroring), which the caller treats as "dismissed".
export async function batchGetHubSpotTaskStatuses(
  userId: string,
  hubspotTaskIds: string[]
): Promise<Map<string, string | null>> {
  if (hubspotTaskIds.length === 0) return new Map();

  return withHubspotAuth(userId, async (accessToken) => {
    const res = await fetch("https://api.hubapi.com/crm/v3/objects/tasks/batch/read", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: hubspotTaskIds.map((id) => ({ id })),
        properties: ["hs_task_status"],
      }),
    });
    if (res.status === 401) throw new Error("batchGetHubSpotTaskStatuses auth failed: 401");
    if (!res.ok) throw new Error(`HubSpot task batch read failed (${res.status}): ${await res.text()}`);

    const data = (await res.json()) as {
      results?: Array<{ id: string; properties: { hs_task_status?: string | null } }>;
    };
    const map = new Map<string, string | null>();
    for (const r of data.results ?? []) {
      map.set(r.id, r.properties.hs_task_status ?? null);
    }
    return map;
  });
}
