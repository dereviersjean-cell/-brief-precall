import { resolveContactId, withHubspotAuth } from "./hubspot";
import type { AutofillObject, AutofillProperty } from "../hubspot-autofill";

// Lecture et écriture des trois objets HubSpot que Brief met à jour après
// chaque call (lib/hubspot-autofill.ts, 10/11/2026) : deal, contact,
// entreprise. Tout passe par le jeton d'un utilisateur qui a connecté HubSpot
// (withHubspotAuth : renouvellement sur 401 compris).

const API = "https://api.hubapi.com";
const PATH: Record<AutofillObject, string> = { deal: "deals", contact: "contacts", company: "companies" };

async function getJson<T>(accessToken: string, path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  // withHubspotAuth ne renouvelle le jeton que sur une erreur qui mentionne 401.
  if (res.status === 401) throw new Error(`HubSpot ${path} auth failed: 401`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

// Les propriétés visibles d'un objet, telles que le client les a dans son
// HubSpot.
export async function listHubSpotProperties(userId: string, object: AutofillObject): Promise<AutofillProperty[]> {
  return withHubspotAuth(userId, async (accessToken) => {
    const data = await getJson<{
      results?: {
        name: string;
        label: string;
        description?: string;
        type: string;
        fieldType: string;
        hidden?: boolean;
        calculated?: boolean;
        hubspotDefined?: boolean;
        options?: { label: string; value: string; hidden?: boolean }[];
        modificationMetadata?: { readOnlyValue?: boolean };
      }[];
    }>(accessToken, `/crm/v3/properties/${PATH[object]}`);
    if (!data) throw new Error("Lecture des propriétés HubSpot impossible");
    return (data.results ?? [])
      .filter((p) => !p.hidden)
      .map((p) => ({
        name: p.name,
        label: p.label,
        description: p.description ?? "",
        type: p.type,
        fieldType: p.fieldType,
        options: (p.options ?? []).filter((o) => !o.hidden).map((o) => ({ label: o.label, value: o.value })),
        readOnly: !!p.calculated || !!p.modificationMetadata?.readOnlyValue,
        custom: !p.hubspotDefined,
      }));
  });
}

export async function getHubSpotObjectValues(userId: string, object: AutofillObject, id: string, properties: string[]): Promise<Record<string, string | null>> {
  if (properties.length === 0) return {};
  return withHubspotAuth(userId, async (accessToken) => {
    const row = await getJson<{ properties: Record<string, string | null> }>(
      accessToken,
      `/crm/v3/objects/${PATH[object]}/${id}?properties=${properties.map(encodeURIComponent).join(",")}`
    );
    if (!row) throw new Error(`Lecture HubSpot impossible (${PATH[object]} ${id})`);
    return Object.fromEntries(properties.map((p) => [p, row.properties[p] ?? null]));
  });
}

export async function updateHubSpotObject(userId: string, object: AutofillObject, id: string, properties: Record<string, string>): Promise<void> {
  if (Object.keys(properties).length === 0) return;
  await withHubspotAuth(userId, async (accessToken) => {
    const res = await fetch(`${API}/crm/v3/objects/${PATH[object]}/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });
    if (res.status === 401) throw new Error("updateHubSpotObject auth failed: 401");
    if (!res.ok) throw new Error(`Mise à jour HubSpot refusée (${PATH[object]}, ${res.status}) : ${(await res.text()).slice(0, 400)}`);
  });
}

// Les objets modifiés le plus récemment, avec les propriétés demandées : de
// quoi montrer au manager un exemple de ce que chaque propriété contient déjà.
export async function sampleHubSpotObjects(userId: string, object: AutofillObject, properties: string[], limit = 100): Promise<Record<string, string | null>[]> {
  if (properties.length === 0) return [];
  return withHubspotAuth(userId, async (accessToken) => {
    const data = await getJson<{ results?: { properties: Record<string, string | null> }[] }>(accessToken, `/crm/v3/objects/${PATH[object]}/search`, {
      method: "POST",
      body: JSON.stringify({
        sorts: [{ propertyName: "hs_lastmodifieddate", direction: "DESCENDING" }],
        properties,
        limit: Math.min(limit, 100),
      }),
    });
    return (data?.results ?? []).map((r) => r.properties);
  });
}

export type DealTargets = {
  contact: { id: string; name: string | null; email: string | null } | null;
  company: { id: string; name: string | null } | null;
};

type Assoc = { results?: { toObjectId: number | string; associationTypes?: { label?: string | null }[] }[] };

// Le contact et l'entreprise que ce call met à jour : le contact du deal qui
// porte l'email du prospect (sinon le contact HubSpot de cet email, sinon
// l'unique contact du deal) ; l'entreprise du deal (la principale d'abord),
// sinon celle du contact. Aucun objet n'est créé.
export async function findDealTargets(userId: string, dealId: string, contactEmail: string | null): Promise<DealTargets> {
  return withHubspotAuth(userId, async (accessToken) => {
    const [contactAssoc, companyAssoc] = await Promise.all([
      getJson<Assoc>(accessToken, `/crm/v4/objects/deals/${dealId}/associations/contacts?limit=100`),
      getJson<Assoc>(accessToken, `/crm/v4/objects/deals/${dealId}/associations/companies?limit=100`),
    ]);
    const contactIds = [...new Set((contactAssoc?.results ?? []).map((r) => String(r.toObjectId)))];
    const contacts = contactIds.length
      ? (
          await getJson<{ results?: { id: string; properties: Record<string, string | null> }[] }>(accessToken, "/crm/v3/objects/contacts/batch/read", {
            method: "POST",
            body: JSON.stringify({ inputs: contactIds.slice(0, 100).map((id) => ({ id })), properties: ["email", "firstname", "lastname"] }),
          })
        )?.results ?? []
      : [];
    const shape = (c: { id: string; properties: Record<string, string | null> }) => ({
      id: c.id,
      name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" ") || null,
      email: c.properties.email ?? null,
    });
    const email = contactEmail?.trim().toLowerCase() || null;
    let contact: DealTargets["contact"] = null;
    const byEmail = email ? contacts.find((c) => (c.properties.email ?? "").toLowerCase() === email) : undefined;
    if (byEmail) contact = shape(byEmail);
    else if (email) {
      const id = await resolveContactId(accessToken, email);
      if (id) {
        const row = await getJson<{ id: string; properties: Record<string, string | null> }>(accessToken, `/crm/v3/objects/contacts/${id}?properties=email,firstname,lastname`);
        contact = row ? shape(row) : { id, name: null, email };
      }
    }
    if (!contact && contacts.length === 1) contact = shape(contacts[0]);

    const companyRows = companyAssoc?.results ?? [];
    let companyId: string | null =
      String(companyRows.find((r) => (r.associationTypes ?? []).some((t) => (t.label ?? "").toLowerCase() === "primary"))?.toObjectId ?? companyRows[0]?.toObjectId ?? "") || null;
    if (!companyId && contact) {
      const viaContact = await getJson<Assoc>(accessToken, `/crm/v4/objects/contacts/${contact.id}/associations/companies?limit=10`);
      companyId = String(viaContact?.results?.[0]?.toObjectId ?? "") || null;
    }
    let company: DealTargets["company"] = null;
    if (companyId) {
      const row = await getJson<{ id: string; properties: Record<string, string | null> }>(accessToken, `/crm/v3/objects/companies/${companyId}?properties=name`);
      company = { id: companyId, name: row?.properties.name ?? null };
    }
    return { contact, company };
  });
}
