import { marked, Renderer } from "marked";
import { getCrmTokens, saveCrmTokens, deleteCrmTokens } from "./db";

// Module Distribution Flexible, sous-étape D (Slack, from scratch). Per-user
// OAuth connection, same shape as lib/crm/hubspot.ts / lib/crm/pipedrive.ts
// (each commercial connects their own Slack account) — reuses the generic
// crm_connections table (provider="slack") instead of a dedicated table:
// the shape is identical (access_token + one extra provider-specific
// string), and this avoids a migration. IMPORTANT: api_domain is repurposed
// here to hold the Slack user ID (who to DM), not a domain — same kind of
// per-provider field reuse as Pipedrive's api_domain holding a full
// "https://..." URL instead of a bare domain.
//
// No refresh token: Slack's classic OAuth v2 user tokens (xoxp-...) don't
// expire or rotate unless the app opts into token rotation, which this app
// doesn't — so there's no refreshSlackToken/withSlackAuth retry-on-401
// wrapper like the CRM modules have. If the user revokes access from
// Slack's side, chat.postMessage fails with an auth error and the fix is
// reconnecting, exactly like the CRM "reconnect" banners.
const SLACK_OAUTH_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_API_BASE = "https://slack.com/api";
const REDIRECT_URI = "https://brief-precall.vercel.app/api/slack/callback";

// Per-user authorization uses "user_scope" (not "scope", which requests
// bot/workspace-wide permissions) — confirmed against
// docs.slack.dev/authentication/installing-with-oauth. chat:write alone is
// listed as sufficient for chat.postMessage with a user token (confirmed
// against docs.slack.dev/reference/methods/chat.postMessage) — posting with
// channel = the authorizing user's own ID opens/reuses their own DM
// automatically, no separate im:write/conversations.open call needed.
const USER_SCOPE = "chat:write";

export function getSlackAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    user_scope: USER_SCOPE,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export type SlackTokens = {
  access_token: string; // authed_user.access_token (xoxp-...)
  slackUserId: string; // authed_user.id — who chat.postMessage targets
};

// Slack's oauth.v2.access always returns HTTP 200, even on failure — check
// the `ok` field, not res.status (same gotcha applies to every Slack Web
// API call below).
export async function exchangeSlackCode(code: string): Promise<SlackTokens> {
  const res = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    authed_user?: { id?: string; access_token?: string };
  };
  if (!data.ok || !data.authed_user?.access_token || !data.authed_user.id) {
    throw new Error(`Slack token exchange failed: ${data.error ?? res.status}`);
  }

  return { access_token: data.authed_user.access_token, slackUserId: data.authed_user.id };
}

export async function hasSlackConnection(userId: string): Promise<boolean> {
  const tokens = await getCrmTokens(userId, "slack");
  return tokens !== null && !!tokens.api_domain;
}

export async function saveSlackConnection(userId: string, tokens: SlackTokens): Promise<void> {
  await saveCrmTokens(userId, "slack", tokens.access_token, "", tokens.slackUserId);
}

export async function disconnectSlack(userId: string): Promise<void> {
  await deleteCrmTokens(userId, "slack");
}

export async function sendSlackDirectMessage(accessToken: string, slackUserId: string, text: string): Promise<void> {
  const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel: slackUserId, text, unfurl_links: false }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack postMessage failed: ${data.error ?? "unknown error"}`);
}

export type SlackDispatchResult = { target: "dm" | "none" };

// Entry point for the dispatcher — unlike writeToHubSpotCascade/
// writeToPipedriveCascade, there's no contact/deal/meeting lookup: Slack
// DMs the commercial themselves (their own connected Slack account), not a
// record belonging to the external contact.
export async function writeToSlackDM(userId: string, text: string): Promise<SlackDispatchResult> {
  const tokens = await getCrmTokens(userId, "slack");
  if (!tokens || !tokens.api_domain) return { target: "none" };
  await sendSlackDirectMessage(tokens.access_token, tokens.api_domain, text);
  return { target: "dm" };
}

// Slack "mrkdwn" is not GFM markdown: *bold* (single asterisk, not **),
// _italic_, ~strike~, <url|text> links, no header syntax, no native
// bullet/numbered list rendering (bullets are rendered here as literal "•"/
// "1." prefixes so they still read correctly as plain text). Reuses the
// marked Renderer pattern already established in lib/crm/hubspot.ts /
// lib/crm/pipedrive.ts (there targeting HTML; here targeting mrkdwn text).
function createSlackMrkdwnRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = ({ tokens }) => `*${renderer.parser.parseInline(tokens)}*\n\n`;
  renderer.paragraph = ({ tokens }) => `${renderer.parser.parseInline(tokens)}\n\n`;
  renderer.strong = ({ tokens }) => `*${renderer.parser.parseInline(tokens)}*`;
  renderer.em = ({ tokens }) => `_${renderer.parser.parseInline(tokens)}_`;
  renderer.del = ({ tokens }) => `~${renderer.parser.parseInline(tokens)}~`;
  renderer.codespan = ({ text }) => `\`${text}\``;
  renderer.link = ({ href, tokens }) => `<${href}|${renderer.parser.parseInline(tokens)}>`;
  renderer.hr = () => `───\n\n`;
  renderer.br = () => "\n";

  renderer.list = (token) => {
    const lines = token.items.map((item, i) => {
      const bullet = token.ordered ? `${(Number(token.start) || 1) + i}.` : "•";
      return `${bullet} ${renderer.parser.parseInline(item.tokens).trim()}`;
    });
    return `${lines.join("\n")}\n\n`;
  };

  // Same "flatten table to a bullet list" treatment as
  // createHubspotMarkdownRenderer/createPipedriveMarkdownRenderer — Slack
  // mrkdwn has no table syntax at all.
  renderer.table = (token) => {
    const headers = token.header.map((cell) => renderer.parser.parseInline(cell.tokens));
    const rows = token.rows
      .map(
        (row) =>
          `• ${row
            .map((cell, i) => `*${headers[i] ?? ""}:* ${renderer.parser.parseInline(cell.tokens)}`)
            .join(" — ")}`
      )
      .join("\n");
    return `${rows}\n\n`;
  };

  return renderer;
}

// marked's tokenizer HTML-escapes entities (&, <, >, ") in plain text runs
// regardless of the renderer's target format, since escaping normally
// happens for HTML safety — not applicable to Slack's mrkdwn, so unescape
// them back on the final output.
function unescapeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function mrkdwnMessageForSlack(params: { markdown: string; linkUrl: string; linkLabel: string }): string {
  const body = marked.parse(params.markdown, { renderer: createSlackMrkdwnRenderer() }) as string;
  const header = `*🤖 Généré par Brief* — <${params.linkUrl}|${params.linkLabel}>\n───\n`;
  return unescapeHtmlEntities(`${header}${body}`).trim();
}
