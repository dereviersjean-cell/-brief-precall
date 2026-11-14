import { withHubspotAuth } from "./hubspot";

// Le contexte d'un rendez-vous lu dans HubSpot (demande d'Hubert, 12/11/2026 ;
// périmètre de la V1 fixé par sa réponse à C11 : « notes et activités
// HubSpot, échanges email, comptes rendus d'appels »). Sert à dire, en tête du
// brief, d'où vient le rendez-vous et pourquoi le prospect l'a accepté. Tout
// est en lecture, et chaque morceau manquant (droit absent, rien d'associé)
// est simplement omis : null quand il n'y a rien d'utile.

const API = "https://api.hubapi.com";
const MAX_PER_KIND = 5;
const MAX_TEXT = 500;

async function call<T>(accessToken: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  // withHubspotAuth ne renouvelle le jeton que sur une erreur qui mentionne 401.
  if (res.status === 401) throw new Error(`HubSpot ${path} auth failed: 401`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function plain(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

type Engagement = { properties: Record<string, string | null> };

async function associated(accessToken: string, contactId: string, kind: "notes" | "emails" | "calls", properties: string[]): Promise<Engagement[]> {
  const links = await call<{ results?: { toObjectId: number | string }[] }>(accessToken, `/crm/v4/objects/contacts/${contactId}/associations/${kind}?limit=50`);
  const ids = (links?.results ?? []).map((r) => String(r.toObjectId));
  if (ids.length === 0) return [];
  const batch = await call<{ results?: Engagement[] }>(accessToken, `/crm/v3/objects/${kind}/batch/read`, {
    method: "POST",
    body: JSON.stringify({ properties: [...properties, "hs_timestamp"], inputs: ids.slice(-30).map((id) => ({ id })) }),
  });
  return (batch?.results ?? [])
    .sort((a, b) => (b.properties.hs_timestamp ?? "").localeCompare(a.properties.hs_timestamp ?? ""))
    .slice(0, MAX_PER_KIND);
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "date inconnue");

// Le bloc de texte donné au modèle, ou null : contact inconnu de HubSpot, ou
// rien à lire dessus.
export async function getHubSpotMeetingContext(userId: string, contactEmail: string): Promise<string | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const search = await call<{ results?: { id: string; properties: Record<string, string | null> }[] }>(accessToken, "/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: contactEmail }] }],
        properties: ["hs_analytics_source", "hs_analytics_source_data_1", "hs_analytics_source_data_2", "hs_latest_source", "hs_lead_status", "lifecyclestage", "createdate"],
        limit: 1,
      }),
    });
    const contact = search?.results?.[0];
    if (!contact) return null;

    const [notes, emails, calls] = await Promise.all([
      associated(accessToken, contact.id, "notes", ["hs_note_body"]).catch(() => []),
      associated(accessToken, contact.id, "emails", ["hs_email_subject", "hs_email_text", "hs_email_direction"]).catch(() => []),
      associated(accessToken, contact.id, "calls", ["hs_call_title", "hs_call_body"]).catch(() => []),
    ]);

    const p = contact.properties;
    const lines: string[] = [];
    const source = [p.hs_analytics_source, p.hs_analytics_source_data_1, p.hs_analytics_source_data_2].filter(Boolean).join(" / ");
    if (source) lines.push(`- Source d'origine du contact : ${source}`);
    if (p.hs_latest_source && p.hs_latest_source !== p.hs_analytics_source) lines.push(`- Dernière source : ${p.hs_latest_source}`);
    if (p.hs_lead_status) lines.push(`- Statut du lead : ${p.hs_lead_status}`);
    if (p.createdate) lines.push(`- Contact créé le ${day(p.createdate)}`);

    // Les notes que Brief a lui-même écrites ne disent rien de l'origine.
    for (const n of notes) {
      const text = plain(n.properties.hs_note_body);
      if (text && !/Réf\. Brief/i.test(text)) lines.push(`- Note du ${day(n.properties.hs_timestamp)} : ${text}`);
    }
    for (const e of emails) {
      const text = plain(e.properties.hs_email_text);
      const subject = e.properties.hs_email_subject ?? "sans objet";
      const way = e.properties.hs_email_direction === "INCOMING_EMAIL" ? "reçu du prospect" : "envoyé au prospect";
      lines.push(`- Email ${way} le ${day(e.properties.hs_timestamp)} — ${subject}${text ? ` : ${text}` : ""}`);
    }
    for (const c of calls) {
      const text = plain(c.properties.hs_call_body);
      if (text || c.properties.hs_call_title) lines.push(`- Appel du ${day(c.properties.hs_timestamp)} — ${c.properties.hs_call_title ?? "sans titre"}${text ? ` : ${text}` : ""}`);
    }
    return lines.length > 0 ? lines.join("\n") : null;
  });
}
