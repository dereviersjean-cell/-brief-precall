import { createHubSpotNoteOnDeal, resolveContactId, withHubspotAuth } from "./hubspot";
import type { HubspotDealSnapshot } from "../deal-memory-schema";
import { computePipelineStats, stageStays, type PipelineStageDef, type PipelineStats } from "../deal-pipeline-stats";

export type { HubspotDealSnapshot };

// Deal Execution, étape 3 (27/10/2026) : lire et écrire le deal HubSpot d'un
// prospect. Tout passe par le jeton d'un utilisateur qui a connecté HubSpot
// (withHubspotAuth : renouvellement sur 401 compris).

type Pipeline = {
  id: string;
  label: string;
  stages: { id: string; label: string; displayOrder?: number; metadata?: { isClosed?: string; probability?: string } }[];
};

type StageHistoryEntry = { value: string; timestamp: string };

// L'entrée dans l'étape actuelle : début du dernier passage dans l'étape où
// le deal se trouve (HubSpot rend l'historique du plus récent au plus ancien).
function enteredCurrentStage(history: StageHistoryEntry[] | undefined, currentStage: string | null | undefined): string | null {
  if (!history?.length || !currentStage) return null;
  const stays = stageStays({ id: "", changes: history.map((h) => ({ stageId: h.value, at: h.timestamp })) });
  const last = stays.at(-1);
  return last && last.stageId === currentStage ? new Date(last.enteredAt).toISOString() : null;
}

const API = "https://api.hubapi.com";

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

async function getPipelines(accessToken: string): Promise<Pipeline[]> {
  const data = await getJson<{ results?: Pipeline[] }>(accessToken, "/crm/v3/pipelines/deals");
  return data?.results ?? [];
}

function isClosedStage(pipelines: Pipeline[], stageId: string | null | undefined): boolean {
  if (!stageId) return false;
  for (const p of pipelines) {
    const stage = p.stages.find((s) => s.id === stageId);
    if (stage) return stage.metadata?.isClosed === "true";
  }
  return stageId === "closedwon" || stageId === "closedlost";
}

async function associatedDealIds(accessToken: string, objectType: "contacts" | "companies", objectId: string): Promise<string[]> {
  const data = await getJson<{ results?: { toObjectId: string | number }[] }>(
    accessToken,
    `/crm/v4/objects/${objectType}/${objectId}/associations/deals`
  );
  return (data?.results ?? []).map((r) => String(r.toObjectId));
}

async function companyIdForDomain(accessToken: string, domain: string): Promise<string | null> {
  const data = await getJson<{ results?: { id: string }[] }>(accessToken, "/crm/v3/objects/companies/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "domain", operator: "EQ", value: domain }] }],
      properties: ["domain"],
      limit: 1,
    }),
  });
  return data?.results?.[0]?.id ?? null;
}

// Le deal ouvert le plus récent parmi des identifiants donnés.
async function latestOpenDeal(accessToken: string, dealIds: string[], pipelines: Pipeline[]): Promise<string | null> {
  if (dealIds.length === 0) return null;
  const data = await getJson<{ results?: { id: string; properties: { dealstage?: string | null; createdate?: string | null } }[] }>(
    accessToken,
    "/crm/v3/objects/deals/batch/read",
    { method: "POST", body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })), properties: ["dealstage", "createdate"] }) }
  );
  const open = (data?.results ?? [])
    .filter((d) => !isClosedStage(pipelines, d.properties.dealstage))
    .sort((a, b) => (b.properties.createdate ?? "").localeCompare(a.properties.createdate ?? ""));
  return open[0]?.id ?? null;
}

async function dealIdsNamed(accessToken: string, name: string): Promise<string[]> {
  const data = await getJson<{ results?: { id: string }[] }>(accessToken, "/crm/v3/objects/deals/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "dealname", operator: "EQ", value: name }] }],
      properties: ["dealname"],
      limit: 10,
    }),
  });
  return (data?.results ?? []).map((d) => d.id);
}

// Le deal HubSpot d'un prospect : celui du contact d'abord (l'email du call),
// sinon celui de son entreprise (le domaine), sinon un deal qui porte le nom
// de l'entreprise — un call importé n'a souvent ni email ni domaine, et les
// deals sont le plus souvent nommés d'après le client. Un premier rendez-vous
// n'a souvent pas encore de deal : null, sans en créer (décision du 26/10/2026).
export async function findHubSpotDealForProspect(
  userId: string,
  prospect: { contactEmail: string | null; domain: string | null; companyName?: string | null }
): Promise<string | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const pipelines = await getPipelines(accessToken);
    if (prospect.contactEmail) {
      const contactId = await resolveContactId(accessToken, prospect.contactEmail);
      if (contactId) {
        const dealId = await latestOpenDeal(accessToken, await associatedDealIds(accessToken, "contacts", contactId), pipelines);
        if (dealId) return dealId;
      }
    }
    if (prospect.domain) {
      const companyId = await companyIdForDomain(accessToken, prospect.domain);
      if (companyId) {
        const dealId = await latestOpenDeal(accessToken, await associatedDealIds(accessToken, "companies", companyId), pipelines);
        if (dealId) return dealId;
      }
    }
    if (prospect.companyName) return latestOpenDeal(accessToken, await dealIdsNamed(accessToken, prospect.companyName), pipelines);
    return null;
  });
}

export async function getHubSpotDealSnapshot(userId: string, dealId: string): Promise<HubspotDealSnapshot | null> {
  return withHubspotAuth(userId, async (accessToken) => {
    const [deal, pipelines, token] = await Promise.all([
      getJson<{ id: string; properties: Record<string, string | null>; propertiesWithHistory?: { dealstage?: StageHistoryEntry[] } }>(
        accessToken,
        `/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,pipeline,amount,closedate,hs_next_step&propertiesWithHistory=dealstage`
      ),
      getPipelines(accessToken),
      getJson<{ hub_id?: number }>(accessToken, `/oauth/v1/access-tokens/${accessToken}`),
    ]);
    if (!deal) return null;
    const p = deal.properties;
    const pipeline = pipelines.find((x) => x.id === p.pipeline) ?? null;
    const index = pipeline ? pipeline.stages.findIndex((s) => s.id === p.dealstage) : -1;
    const amount = p.amount ? Number(p.amount) : null;
    return {
      id: deal.id,
      name: p.dealname ?? null,
      pipeline: pipeline?.label ?? null,
      stage: index >= 0 ? pipeline!.stages.at(index)!.label : p.dealstage ?? null,
      stageIndex: index >= 0 ? index + 1 : null,
      stageCount: pipeline ? pipeline.stages.length : null,
      closed: isClosedStage(pipelines, p.dealstage),
      amount: amount !== null && Number.isFinite(amount) ? amount : null,
      closeDate: p.closedate ?? null,
      nextStep: p.hs_next_step ?? null,
      url: token?.hub_id ? `https://app.hubspot.com/contacts/${token.hub_id}/record/0-3/${deal.id}` : null,
      pipelineId: p.pipeline ?? null,
      stageId: p.dealstage ?? null,
      stageEnteredAt: enteredCurrentStage(deal.propertiesWithHistory?.dealstage, p.dealstage),
    };
  });
}

export type HubspotDealProperty = { name: string; label: string; type: string };

// Les propriétés de deal où Brief peut écrire du texte : celles du client,
// MEDDIC ou autres, et les standards modifiables. Les propriétés calculées ou
// en lecture seule sont écartées.
export async function listHubSpotDealTextProperties(userId: string): Promise<HubspotDealProperty[]> {
  return withHubspotAuth(userId, async (accessToken) => {
    const data = await getJson<{
      results?: { name: string; label: string; type: string; calculated?: boolean; hidden?: boolean; modificationMetadata?: { readOnlyValue?: boolean } }[];
    }>(accessToken, "/crm/v3/properties/deals");
    return (data?.results ?? [])
      .filter((p) => p.type === "string" && !p.calculated && !p.hidden && !p.modificationMetadata?.readOnlyValue)
      .map((p) => ({ name: p.name, label: p.label, type: p.type }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  });
}

// Écrit la fiche dans le deal : les propriétés réglées pour l'organisation, et
// une note (remplacée à chaque envoi du même call, grâce à `uid`).
export async function pushToHubSpotDeal(
  userId: string,
  dealId: string,
  payload: { properties: Record<string, string>; noteHtml: string; uid: string }
): Promise<void> {
  if (Object.keys(payload.properties).length > 0) {
    await withHubspotAuth(userId, async (accessToken) => {
      const res = await fetch(`${API}/crm/v3/objects/deals/${dealId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ properties: payload.properties }),
      });
      if (res.status === 401) throw new Error("pushToHubSpotDeal auth failed: 401");
      if (!res.ok) throw new Error(`Mise à jour du deal HubSpot refusée (${res.status}) : ${await res.text()}`);
    });
  }
  await createHubSpotNoteOnDeal(userId, dealId, payload.noteHtml, payload.uid);
}

// Deals créés depuis un an au plus, lus au maximum : de quoi mesurer le
// parcours sans relire tout un portail (la recherche HubSpot s'arrête de
// toute façon à 10 000 résultats).
const STATS_WINDOW_DAYS = 365;
const STATS_MAX_DEALS = 2000;

function stageDefs(pipeline: Pipeline): PipelineStageDef[] {
  return pipeline.stages.map((s, i) => {
    const closed = s.metadata?.isClosed === "true";
    return {
      id: s.id,
      label: s.label,
      order: s.displayOrder ?? i,
      closed,
      won: closed && Number(s.metadata?.probability) === 1,
    };
  });
}

// Le parcours de chaque pipeline, mesuré sur l'historique des étapes des
// deals de l'année (étape 6). Lecture seule.
export async function getHubSpotPipelineStats(userId: string, now: number): Promise<PipelineStats[]> {
  return withHubspotAuth(userId, async (accessToken) => {
    const pipelines = await getPipelines(accessToken);
    const since = now - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const ids: string[] = [];
    let after: string | undefined;
    do {
      const page = await getJson<{ results?: { id: string }[]; paging?: { next?: { after?: string } } }>(
        accessToken,
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify({
            filterGroups: [{ filters: [{ propertyName: "createdate", operator: "GTE", value: String(since) }] }],
            sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
            properties: ["dealstage"],
            limit: 100,
            ...(after ? { after } : {}),
          }),
        }
      );
      if (!page) throw new Error("Recherche des deals HubSpot refusée");
      ids.push(...(page.results ?? []).map((d) => d.id));
      after = page.paging?.next?.after;
    } while (after && ids.length < STATS_MAX_DEALS);

    const histories = new Map<string, { id: string; changes: { stageId: string; at: string }[] }[]>();
    for (let i = 0; i < Math.min(ids.length, STATS_MAX_DEALS); i += 100) {
      const batch = await getJson<{
        results?: { id: string; properties: { pipeline?: string | null }; propertiesWithHistory?: { dealstage?: StageHistoryEntry[] } }[];
      }>(accessToken, "/crm/v3/objects/deals/batch/read", {
        method: "POST",
        body: JSON.stringify({
          inputs: ids.slice(i, i + 100).map((id) => ({ id })),
          properties: ["pipeline"],
          propertiesWithHistory: ["dealstage"],
        }),
      });
      if (!batch) throw new Error("Lecture de l'historique des deals HubSpot refusée");
      for (const deal of batch.results ?? []) {
        const pipelineId = deal.properties.pipeline ?? "default";
        const list = histories.get(pipelineId) ?? [];
        list.push({
          id: deal.id,
          changes: (deal.propertiesWithHistory?.dealstage ?? []).map((h) => ({ stageId: h.value, at: h.timestamp })),
        });
        histories.set(pipelineId, list);
      }
    }

    return pipelines.map((p) => computePipelineStats({ id: p.id, label: p.label, stages: stageDefs(p) }, histories.get(p.id) ?? [], now));
  });
}
