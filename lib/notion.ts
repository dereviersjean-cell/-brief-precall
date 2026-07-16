// Module Team, playbook import via Notion. Uses a Notion "Internal
// Integration" token (pasted once by a manager), not OAuth — Notion's
// public/OAuth integrations require a security review by Notion before they
// work for real users (confirmed against developers.notion.com/docs/
// authorization: "Public integrations require review before deployment"),
// which would make "connect and use it immediately" impossible to deliver.
// Internal integrations need no review: the manager creates one in Notion
// (2 min), shares the playbook page with it there, and pastes the token
// here — same one-time manual setup cost as e.g. HubSpot's `hs project
// upload`, just on Notion's side instead.
const NOTION_API_BASE = "https://api.notion.com/v1";
// Verified current against developers.notion.com/reference/versioning.
const NOTION_VERSION = "2026-03-11";

function notionHeaders(token: string, json = false): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function validateNotionToken(token: string): Promise<boolean> {
  const res = await fetch(`${NOTION_API_BASE}/users/me`, { headers: notionHeaders(token) });
  return res.ok;
}

export type NotionPageSummary = { id: string; title: string };

type NotionTitleProperty = { type?: string; title?: Array<{ plain_text?: string }> };

// The title property's key varies ("Title", "Name", or literally "title"
// depending on whether the page lives in a database) — found by type, not
// by a specific key name.
function extractPageTitle(properties: Record<string, unknown> | undefined): string {
  for (const value of Object.values(properties ?? {})) {
    const prop = value as NotionTitleProperty;
    if (prop.type === "title") {
      const text = (prop.title ?? []).map((t) => t.plain_text ?? "").join("");
      return text || "Sans titre";
    }
  }
  return "Sans titre";
}

// Only returns pages explicitly shared with the integration in Notion
// (confirmed against developers.notion.com/reference/post-search) — never
// the whole workspace, regardless of what the token could theoretically see.
export async function searchNotionPages(token: string): Promise<NotionPageSummary[]> {
  const res = await fetch(`${NOTION_API_BASE}/search`, {
    method: "POST",
    headers: notionHeaders(token, true),
    body: JSON.stringify({ filter: { property: "object", value: "page" } }),
  });
  if (!res.ok) throw new Error(`Notion search failed: ${res.status}`);
  const data = (await res.json()) as { results: Array<{ id: string; properties?: Record<string, unknown> }> };
  return data.results.map((p) => ({ id: p.id, title: extractPageTitle(p.properties) }));
}

type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

async function fetchBlockChildren(blockId: string, token: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const res = await fetch(url.toString(), { headers: notionHeaders(token) });
    if (!res.ok) throw new Error(`Notion blocks fetch failed: ${res.status}`);
    const data = (await res.json()) as { results: NotionBlock[]; has_more: boolean; next_cursor: string | null };
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);
  return blocks;
}

function blockPlainText(block: NotionBlock): string {
  const content = block[block.type] as { rich_text?: Array<{ plain_text?: string }> } | undefined;
  return (content?.rich_text ?? []).map((t) => t.plain_text ?? "").join("");
}

const HEADING_PREFIX: Record<string, string> = { heading_1: "# ", heading_2: "## ", heading_3: "### " };
const LIST_PREFIX: Record<string, string> = { bulleted_list_item: "• ", numbered_list_item: "- ", to_do: "☐ " };

// Recursively flattens a page's block tree into plain text with light
// markdown-ish prefixes — the extraction prompt (playbook_extraction_prompt,
// lib/admin-config.ts) is tuned against pasted text, not Notion's block
// JSON, so this deliberately mirrors what a manager would get by copying
// the page and pasting it into the existing "Coller le texte" flow.
async function blocksToText(blocks: NotionBlock[], token: string, depth = 0): Promise<string> {
  const lines: string[] = [];
  for (const block of blocks) {
    const prefix = HEADING_PREFIX[block.type] ?? LIST_PREFIX[block.type] ?? "";
    const text = blockPlainText(block);
    if (text) lines.push(`${"  ".repeat(depth)}${prefix}${text}`);
    if (block.has_children) {
      const children = await fetchBlockChildren(block.id, token);
      const childText = await blocksToText(children, token, depth + 1);
      if (childText) lines.push(childText);
    }
  }
  return lines.join("\n");
}

export async function getNotionPageText(token: string, pageId: string): Promise<string> {
  const blocks = await fetchBlockChildren(pageId, token);
  return blocksToText(blocks, token);
}
