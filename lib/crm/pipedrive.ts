import { marked, Renderer } from "marked";
import { getCrmTokens, saveCrmTokens } from "../db";

const PIPEDRIVE_OAUTH_BASE = "https://oauth.pipedrive.com/oauth";
const REDIRECT_URI = "https://brief-precall.vercel.app/api/crm/pipedrive/callback";

// Distribution Flexible sous-étape C2 (write briefs/analyses into Pipedrive,
// mirrors the HubSpot C1 cascade). Unlike HubSpot, Pipedrive doesn't accept a
// "scope" query param on /oauth/authorize (confirmed against
// pipedrive.readme.io/docs/marketplace-oauth-authorization — the sample URL
// only has client_id/state/redirect_uri) — scopes are fixed by what's
// configured for the app in the Pipedrive Developer Hub. Writing notes/
// activities requires deals:full, contacts:full, and activities:full to be
// enabled there (deals:full/contacts:full cover notes on their respective
// entity — like HubSpot, Pipedrive has no separate "notes" scope). This is a
// manual Developer Hub change, not a code change. IMPORTANT: same
// reconnect-required caveat as HubSpot — existing connections predate the
// write scopes; hasPipedriveWriteAccess (below) gates writes until the user
// reconnects via /api/crm/pipedrive/start.

export function getPipedriveAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PIPEDRIVE_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    state,
  });
  return `${PIPEDRIVE_OAUTH_BASE}/authorize?${params.toString()}`;
}

export type PipedriveTokens = {
  access_token: string;
  refresh_token: string;
  api_domain: string;
  expires_in: number;
  scope: string;
};

function basicAuthHeader(): string {
  const creds = `${process.env.PIPEDRIVE_CLIENT_ID}:${process.env.PIPEDRIVE_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

export async function exchangePipedriveCode(code: string): Promise<PipedriveTokens> {
  const res = await fetch(`${PIPEDRIVE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Pipedrive token exchange failed: ${data.error ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    api_domain: (data.api_domain as string) ?? "api.pipedrive.com",
    expires_in: (data.expires_in as number) ?? 3600,
    scope: (data.scope as string) ?? "",
  };
}

export async function refreshPipedriveToken(refreshToken: string): Promise<PipedriveTokens> {
  const res = await fetch(`${PIPEDRIVE_OAUTH_BASE}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.PIPEDRIVE_CLIENT_ID!,
      client_secret: process.env.PIPEDRIVE_CLIENT_SECRET!,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("[refreshPipedriveToken] status:", res.status, "body:", JSON.stringify(data));
    throw new Error(`Pipedrive token refresh failed: ${data.error ?? res.status}`);
  }

  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string) ?? refreshToken,
    api_domain: (data.api_domain as string) ?? "api.pipedrive.com",
    expires_in: (data.expires_in as number) ?? 3600,
    scope: (data.scope as string) ?? "",
  };
}

export type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  org_name: string | null;
  person_name: string | null;
  close_time: string | null;
  won_time: string | null;
  add_time: string;
};

export async function getWonDeals(
  accessToken: string,
  apiDomain: string,
  limit = 50
): Promise<PipedriveDeal[]> {
  const params = new URLSearchParams({
    status: "won",
    limit: String(limit),
    sort: "won_time DESC",
  });

  const res = await fetch(`${apiDomain}/api/v1/deals?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as { success: boolean; data: unknown[] | null };
  if (!res.ok || !data.success) {
    throw new Error(`getWonDeals failed: ${res.status}`);
  }

  return (data.data ?? []) as PipedriveDeal[];
}

export type PipedriveDealDetail = PipedriveDeal & {
  person_email: string | null;
  org_id: number | null;
  notes?: string;
};

export async function getDealDetails(
  accessToken: string,
  apiDomain: string,
  dealId: number
): Promise<PipedriveDealDetail | null> {
  const res = await fetch(`${apiDomain}/api/v1/deals/${dealId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as { success: boolean; data: unknown | null };
  if (!res.ok || !data.success || !data.data) return null;

  const d = data.data as Record<string, unknown>;
  return {
    id: d.id as number,
    title: d.title as string,
    value: d.value as number,
    currency: d.currency as string,
    status: d.status as string,
    org_name: (d.org_name as string) ?? null,
    person_name: (d.person_name as string) ?? null,
    close_time: (d.close_time as string) ?? null,
    won_time: (d.won_time as string) ?? null,
    add_time: d.add_time as string,
    person_email: (d["cc_email"] as string) ?? null,
    org_id: (d.org_id as number) ?? null,
  };
}

export type PipedriveOrg = {
  id: number;
  name: string;
  people_count: number;
  open_deals_count: number;
  won_deals_count: number;
};

export async function searchCompany(
  accessToken: string,
  apiDomain: string,
  query: string
): Promise<PipedriveOrg[]> {
  const params = new URLSearchParams({
    term: query,
    item_type: "organization",
    limit: "10",
  });

  const res = await fetch(`${apiDomain}/api/v1/itemSearch?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json()) as {
    success: boolean;
    data: { items: { item: unknown }[] } | null;
  };

  if (res.status === 401 || res.status === 403) {
    throw new Error(`searchCompany auth failed: ${res.status}`);
  }
  if (!res.ok || !data.success || !data.data) return [];

  return data.data.items.map((i) => i.item as PipedriveOrg);
}

// ─── Distribution Flexible, sous-étape C2 (Pipedrive writes) ───────────────
//
// Mirrors the HubSpot cascade in lib/crm/hubspot.ts: every function below
// takes userId directly and resolves/refreshes the token itself via
// withPipedriveAuth, instead of the accessToken/apiDomain-as-params style
// used by getWonDeals/getDealDetails/searchCompany above (those predate this
// sub-step and are left as-is — no reason to touch working read call sites).

async function withPipedriveAuth<T>(
  userId: string,
  fn: (accessToken: string, apiDomain: string) => Promise<T>
): Promise<T> {
  const tokens = await getCrmTokens(userId, "pipedrive");
  if (!tokens) throw new Error("Pipedrive non connecté pour cet utilisateur.");
  const apiDomain = tokens.api_domain ?? "api.pipedrive.com";

  try {
    return await fn(tokens.access_token, apiDomain);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401")) throw err;

    const fresh = await refreshPipedriveToken(tokens.refresh_token);
    try {
      await saveCrmTokens(userId, "pipedrive", fresh.access_token, fresh.refresh_token, fresh.api_domain);
    } catch (saveErr) {
      console.warn("[pipedrive] saveCrmTokens after refresh failed:", saveErr);
    }
    return await fn(fresh.access_token, fresh.api_domain);
  }
}

// Mirrors hasHubSpotWriteAccess (lib/crm/hubspot.ts) — same fail-safe
// contract (false on no token, no scope, or any network error). Pipedrive
// has no dedicated token-introspection endpoint like HubSpot's
// /oauth/v1/access-tokens/{token}; the refresh response itself carries the
// granted "scope" string, so refreshing doubles as the introspection call.
// Requires all three write scopes since the cascade can land on any tier
// (activity, deal, or contact) depending on what's found for the email.
export async function hasPipedriveWriteAccess(userId: string): Promise<boolean> {
  try {
    const tokens = await getCrmTokens(userId, "pipedrive");
    if (!tokens) return false;

    const fresh = await refreshPipedriveToken(tokens.refresh_token);
    saveCrmTokens(userId, "pipedrive", fresh.access_token, fresh.refresh_token, fresh.api_domain).catch((err) =>
      console.warn("[hasPipedriveWriteAccess] saveCrmTokens failed (non-blocking):", err)
    );

    const grantedScopes = fresh.scope.split(" ");
    return ["deals:full", "contacts:full", "activities:full"].every((s) => grantedScopes.includes(s));
  } catch (err) {
    console.error(`[hasPipedriveWriteAccess] failed for user ${userId}:`, err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function resolvePersonId(accessToken: string, apiDomain: string, email: string): Promise<number | null> {
  const params = new URLSearchParams({
    term: email,
    item_type: "person",
    fields: "email",
    exact_match: "true",
  });
  const res = await fetch(`${apiDomain}/api/v1/itemSearch?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("resolvePersonId auth failed: 401");
  const data = (await res.json()) as {
    success: boolean;
    data: { items: { item: { id: number } }[] } | null;
  };
  if (!res.ok || !data.success || !data.data) return null;
  return data.data.items[0]?.item.id ?? null;
}

export type PipedriveContactMatch = { personId: number };

export async function findPipedriveContactForEmail(
  userId: string,
  contactEmail: string
): Promise<PipedriveContactMatch | null> {
  return withPipedriveAuth(userId, async (accessToken, apiDomain) => {
    const id = await resolvePersonId(accessToken, apiDomain, contactEmail);
    return id ? { personId: id } : null;
  });
}

export type PipedriveDealMatch = { dealId: number };

export async function findPipedriveDealForEmail(userId: string, contactEmail: string): Promise<PipedriveDealMatch | null> {
  return withPipedriveAuth(userId, async (accessToken, apiDomain) => {
    const personId = await resolvePersonId(accessToken, apiDomain, contactEmail);
    if (!personId) return null;

    const params = new URLSearchParams({
      person_id: String(personId),
      status: "open",
      sort: "add_time DESC",
    });
    const res = await fetch(`${apiDomain}/api/v1/deals?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) throw new Error("findPipedriveDealForEmail auth failed: 401");
    const data = (await res.json()) as { success: boolean; data: { id: number }[] | null };
    if (!res.ok || !data.success) return null;
    const deals = data.data ?? [];
    return deals[0] ? { dealId: deals[0].id } : null;
  });
}

export type PipedriveClosedDeal = { dealId: number; outcome: "won" | "lost"; amount: number | null; closedAt: string | null };

// Mirrors findPipedriveDealForEmail's person resolution, but looks at closed
// deals instead of open ones (module win/loss, syncDealOutcomes cron in
// lib/inngest-functions.ts). Pipedrive's deals endpoint filters status
// server-side (unlike HubSpot, which needs a post-filter) — status: "won"
// and "lost" are two separate calls, same as getWonDeals's status: "won".
export async function findClosedDealsForEmail(userId: string, contactEmail: string): Promise<PipedriveClosedDeal | null> {
  return withPipedriveAuth(userId, async (accessToken, apiDomain) => {
    const personId = await resolvePersonId(accessToken, apiDomain, contactEmail);
    if (!personId) return null;

    async function fetchByStatus(status: "won" | "lost"): Promise<PipedriveDeal[]> {
      const params = new URLSearchParams({ person_id: String(personId), status, sort: "close_time DESC" });
      const res = await fetch(`${apiDomain}/api/v1/deals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) throw new Error("findClosedDealsForEmail auth failed: 401");
      const data = (await res.json()) as { success: boolean; data: PipedriveDeal[] | null };
      if (!res.ok || !data.success) return [];
      return data.data ?? [];
    }

    const [won, lost] = await Promise.all([fetchByStatus("won"), fetchByStatus("lost")]);
    const closed = [...won, ...lost].sort((a, b) => (b.close_time ?? "").localeCompare(a.close_time ?? ""));

    const latest = closed[0];
    if (!latest) return null;
    return {
      dealId: latest.id,
      outcome: latest.status === "won" ? "won" : "lost",
      amount: latest.value ?? null,
      closedAt: latest.close_time,
    };
  });
}

export type PipedriveActivityMatch = { activityId: number; subject: string | null; dueAt: string | null };

type PipedriveActivityResult = {
  id: number;
  subject?: string | null;
  due_date?: string | null;
  due_time?: string | null;
};

// Closest-to-meetingStartAt selection, mirrors findHubSpotMeetingForEmail.
// due_date/due_time are separate fields in the Pipedrive Activities API
// (date-only + time-only), combined here into a single timestamp for
// comparison.
export async function findPipedriveActivityForEmail(
  userId: string,
  contactEmail: string,
  meetingStartAt?: string
): Promise<PipedriveActivityMatch | null> {
  return withPipedriveAuth(userId, async (accessToken, apiDomain) => {
    const personId = await resolvePersonId(accessToken, apiDomain, contactEmail);
    if (!personId) return null;

    const params = new URLSearchParams({
      person_id: String(personId),
      sort_by: "due_date",
      sort_direction: "desc",
      limit: "50",
    });
    const res = await fetch(`${apiDomain}/api/v1/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) throw new Error("findPipedriveActivityForEmail auth failed: 401");
    const data = (await res.json()) as { success: boolean; data: PipedriveActivityResult[] | null };
    if (!res.ok || !data.success) return null;
    const activities = data.data ?? [];
    if (activities.length === 0) return null;

    const targetTime = meetingStartAt ? new Date(meetingStartAt).getTime() : null;
    const timeOf = (a: PipedriveActivityResult): number | null =>
      a.due_date ? new Date(`${a.due_date}T${a.due_time ?? "00:00:00"}`).getTime() : null;

    const closest = activities.reduce<PipedriveActivityResult | null>((best, a) => {
      if (!best) return a;
      const aTime = timeOf(a);
      const bestTime = timeOf(best);
      if (aTime === null) return best;
      if (bestTime === null) return a;
      if (targetTime !== null) {
        return Math.abs(aTime - targetTime) < Math.abs(bestTime - targetTime) ? a : best;
      }
      return aTime > bestTime ? a : best; // no target date — most recent wins
    }, null);

    if (!closest) return null;
    return {
      activityId: closest.id,
      subject: closest.subject ?? null,
      dueAt: closest.due_date ? `${closest.due_date}T${closest.due_time ?? "00:00:00"}` : null,
    };
  });
}

// HubSpot notes/meeting bodies support basic HTML but not tables (see
// createHubspotMarkdownRenderer in lib/crm/hubspot.ts); applying the same
// flatten-table-to-list treatment here defensively, since Pipedrive's docs
// only say note/activity content is "HTML, sanitized server-side" without
// enumerating allowed tags — unverified against a live account, unlike the
// HubSpot renderer.
function createPipedriveMarkdownRenderer(): Renderer {
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

export function htmlBodyForPipedrive(params: { markdown: string; linkUrl: string; linkLabel: string }): string {
  const contentHtml = marked.parse(params.markdown, { renderer: createPipedriveMarkdownRenderer() }) as string;
  return `<p>🤖 <em>Généré par Brief</em> — <a href="${params.linkUrl}">${params.linkLabel}</a></p><hr>${contentHtml}`;
}

// Idempotence marker for the activity-note append path — same detect-and-
// replace strategy as appendToHubSpotMeetingBody (lib/crm/hubspot.ts):
// re-running (regenerated brief, retried dispatch) updates the existing
// section in place instead of stacking a new one below it.
const PIPEDRIVE_ACTIVITY_NOTE_MARKER = "───── 🤖 Généré par Brief ─────";

function mergePipedriveActivityNote(existingNote: string, section: string): string {
  const idx = existingNote.indexOf(PIPEDRIVE_ACTIVITY_NOTE_MARKER);
  const before = (idx === -1 ? existingNote : existingNote.slice(0, idx)).trim();
  return before ? `${before}<br><br>${section}` : section;
}

export async function appendToPipedriveActivityNote(userId: string, activityId: number, htmlBody: string): Promise<void> {
  return withPipedriveAuth(userId, async (accessToken, apiDomain) => {
    const getRes = await fetch(`${apiDomain}/api/v1/activities/${activityId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (getRes.status === 401) throw new Error("appendToPipedriveActivityNote auth failed: 401");
    if (!getRes.ok) throw new Error(`Pipedrive activity GET failed (${getRes.status}): ${await getRes.text()}`);
    const activity = (await getRes.json()) as { success: boolean; data: { note?: string | null } | null };

    const section = `${PIPEDRIVE_ACTIVITY_NOTE_MARKER}<br>${htmlBody}`;
    const newNote = mergePipedriveActivityNote(activity.data?.note ?? "", section);

    const putRes = await fetch(`${apiDomain}/api/v1/activities/${activityId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ note: newNote }),
    });
    if (!putRes.ok) throw new Error(`Pipedrive activity PUT failed (${putRes.status}): ${await putRes.text()}`);
  });
}

// Idempotence for the deal/contact note tiers, same invisible HTML-comment
// marker strategy as upsertHubspotNote (lib/crm/hubspot.ts), keyed by `uid`
// (calendarEventId for briefs, callId for analyses — see
// lib/notifications-dispatcher.ts).
function buildPipedriveNoteMarker(uid: string): string {
  return `<!-- brief-note-uid:${uid} -->`;
}

async function findExistingPipedriveNoteId(
  accessToken: string,
  apiDomain: string,
  objectType: "deal_id" | "person_id",
  objectId: number,
  marker: string
): Promise<number | null> {
  const params = new URLSearchParams({ [objectType]: String(objectId), limit: "100" });
  const res = await fetch(`${apiDomain}/api/v1/notes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("findExistingPipedriveNoteId auth failed: 401");
  const data = (await res.json()) as { success: boolean; data: { id: number; content?: string | null }[] | null };
  if (!res.ok || !data.success) return null;
  const match = (data.data ?? []).find((n) => (n.content ?? "").includes(marker));
  return match?.id ?? null;
}

async function upsertPipedriveNote(
  accessToken: string,
  apiDomain: string,
  htmlBody: string,
  uid: string,
  objectType: "deal_id" | "person_id",
  objectId: number
): Promise<void> {
  const marker = buildPipedriveNoteMarker(uid);
  const contentWithMarker = `${htmlBody}${marker}`;

  const existingNoteId = await findExistingPipedriveNoteId(accessToken, apiDomain, objectType, objectId, marker);
  if (existingNoteId) {
    const putRes = await fetch(`${apiDomain}/api/v1/notes/${existingNoteId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentWithMarker }),
    });
    if (!putRes.ok) throw new Error(`Pipedrive note update failed (${putRes.status}): ${await putRes.text()}`);
    return;
  }

  const res = await fetch(`${apiDomain}/api/v1/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content: contentWithMarker, [objectType]: objectId }),
  });
  if (res.status === 401) throw new Error("upsertPipedriveNote auth failed: 401");
  if (!res.ok) throw new Error(`Pipedrive note creation failed (${res.status}): ${await res.text()}`);
}

export async function createPipedriveNoteOnDeal(userId: string, dealId: number, htmlBody: string, uid: string): Promise<void> {
  return withPipedriveAuth(userId, (accessToken, apiDomain) =>
    upsertPipedriveNote(accessToken, apiDomain, htmlBody, uid, "deal_id", dealId)
  );
}

export async function createPipedriveNoteOnContact(userId: string, personId: number, htmlBody: string, uid: string): Promise<void> {
  return withPipedriveAuth(userId, (accessToken, apiDomain) =>
    upsertPipedriveNote(accessToken, apiDomain, htmlBody, uid, "person_id", personId)
  );
}

export type PipedriveCascadeResult = { target: "activity" | "deal" | "contact" | "none"; id?: number };

// Orchestrates the activity > deal > contact fallback, mirrors
// writeToHubSpotCascade (lib/crm/hubspot.ts). `uid` feeds the deal/contact
// tiers' idempotence marker — the activity tier doesn't need one since
// appendToPipedriveActivityNote already replaces its own marked section in
// place regardless of caller identity.
export async function writeToPipedriveCascade(
  userId: string,
  contactEmail: string,
  htmlBody: string,
  uid: string,
  meetingStartAt?: string
): Promise<PipedriveCascadeResult> {
  const activity = await findPipedriveActivityForEmail(userId, contactEmail, meetingStartAt).catch((err) => {
    console.warn(
      "[writeToPipedriveCascade] findPipedriveActivityForEmail failed (falling back):",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (activity) {
    try {
      await appendToPipedriveActivityNote(userId, activity.activityId, htmlBody);
      return { target: "activity", id: activity.activityId };
    } catch (err) {
      console.warn(
        "[writeToPipedriveCascade] appendToPipedriveActivityNote failed (falling back):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const deal = await findPipedriveDealForEmail(userId, contactEmail).catch((err) => {
    console.warn(
      "[writeToPipedriveCascade] findPipedriveDealForEmail failed (falling back):",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (deal) {
    try {
      await createPipedriveNoteOnDeal(userId, deal.dealId, htmlBody, uid);
      return { target: "deal", id: deal.dealId };
    } catch (err) {
      console.warn(
        "[writeToPipedriveCascade] createPipedriveNoteOnDeal failed (falling back):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const contact = await findPipedriveContactForEmail(userId, contactEmail).catch((err) => {
    console.warn(
      "[writeToPipedriveCascade] findPipedriveContactForEmail failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  });
  if (contact) {
    try {
      await createPipedriveNoteOnContact(userId, contact.personId, htmlBody, uid);
      return { target: "contact", id: contact.personId };
    } catch (err) {
      console.warn(
        "[writeToPipedriveCascade] createPipedriveNoteOnContact failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return { target: "none" };
}
