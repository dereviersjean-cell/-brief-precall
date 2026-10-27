import {
  getHubspotLinkedCalls,
  getHubspotUserForOrganization,
  getOrganizationHubspotMapping,
  getUserName,
  isHubspotAutoPushEnabled,
} from "./db";
import {
  getHubspotTokenInfo,
  listHubSpotDealProperties,
  listHubSpotPipelines,
  sampleHubSpotDeals,
  type HubspotPipeline,
} from "./crm/hubspot-deals";
import { coerceMapping, type HubspotMapping } from "./hubspot-mapping";
import { methodVerdict, proposeMappings, type DiagnosticProperty, type Proposal } from "./hubspot-setup";

// Le diagnostic du HubSpot d'un client pour le setup admin (27/10/2026) : la
// connexion et ses droits, les pipelines avec leurs deals par étape, les
// propriétés de deal avec leur remplissage et des exemples réels (sur les
// derniers deals créés), la proposition de Brief et le réglage actuel.

// Les propriétés standard que Brief peut proposer d'utiliser. Le montant et
// la date de clôture appartiennent au commercial : jamais proposées.
const STANDARD_CANDIDATES = new Set(["description", "hs_next_step"]);
const SAMPLE_SIZE = 200;
const MAX_SAMPLED_PROPERTIES = 150;

export type HubspotSetupData = {
  connected: boolean;
  connectedAs: string | null;
  portalId: number | null;
  canCreateProperties: boolean;
  dealsAnalyzed: number;
  pipelines: (Omit<HubspotPipeline, "stages"> & { stages: (HubspotPipeline["stages"][number] & { count: number })[] })[];
  properties: DiagnosticProperty[];
  proposals: Proposal[];
  verdict: string;
  current: { mapping: HubspotMapping; autoPush: boolean };
  calls: { id: string; meeting_title: string | null; started_at: string | null; created_at: string; dealName: string | null }[];
};

function sampleValue(value: string | null, options: { label: string; value: string }[]): string {
  const label = options.find((o) => o.value === value)?.label ?? value ?? "";
  return label.length > 80 ? `${label.slice(0, 79)}…` : label;
}

export async function loadHubspotSetup(organizationId: string): Promise<HubspotSetupData> {
  const [hubspotUser, orgMapping, autoPush, calls] = await Promise.all([
    getHubspotUserForOrganization(organizationId, []),
    getOrganizationHubspotMapping(organizationId),
    isHubspotAutoPushEnabled(organizationId),
    getHubspotLinkedCalls(organizationId).catch(() => []),
  ]);
  const current = { mapping: coerceMapping(orgMapping), autoPush };
  if (!hubspotUser) {
    return {
      connected: false,
      connectedAs: null,
      portalId: null,
      canCreateProperties: false,
      dealsAnalyzed: 0,
      pipelines: [],
      properties: [],
      proposals: [],
      verdict: "",
      current,
      calls,
    };
  }

  // Le jeton d'abord (renouvelé au besoin), les lectures parallèles ensuite.
  const { scopes, portalId } = await getHubspotTokenInfo(hubspotUser).catch(() => ({ scopes: [] as string[], portalId: null }));
  const [all, pipelines, connectedAs] = await Promise.all([
    listHubSpotDealProperties(hubspotUser),
    listHubSpotPipelines(hubspotUser),
    getUserName(hubspotUser).catch(() => null),
  ]);
  const relevant = all
    .filter((p) => p.custom || STANDARD_CANDIDATES.has(p.name))
    .slice(0, MAX_SAMPLED_PROPERTIES);
  const deals = await sampleHubSpotDeals(hubspotUser, relevant.map((p) => p.name), SAMPLE_SIZE);

  const properties: DiagnosticProperty[] = relevant
    .map((p) => {
      const filled = deals.map((d) => d[p.name]).filter((v): v is string => v !== null && v !== undefined && v !== "");
      return {
        ...p,
        fillRate: deals.length ? filled.length / deals.length : 0,
        samples: [...new Set(filled.map((v) => sampleValue(v, p.options)))].slice(0, 3),
      };
    })
    .sort((a, b) => Number(b.custom) - Number(a.custom) || b.fillRate - a.fillRate || a.label.localeCompare(b.label, "fr"));

  const counts = new Map<string, number>();
  for (const d of deals) if (d.dealstage) counts.set(`${d.pipeline}/${d.dealstage}`, (counts.get(`${d.pipeline}/${d.dealstage}`) ?? 0) + 1);
  const proposals = proposeMappings(properties);

  return {
    connected: true,
    connectedAs,
    portalId,
    canCreateProperties: scopes.includes("crm.schemas.deals.write"),
    dealsAnalyzed: deals.length,
    pipelines: pipelines.map((p) => ({ ...p, stages: p.stages.map((s) => ({ ...s, count: counts.get(`${p.id}/${s.id}`) ?? 0 })) })),
    properties,
    proposals,
    verdict: methodVerdict(proposals),
    current,
    calls,
  };
}
