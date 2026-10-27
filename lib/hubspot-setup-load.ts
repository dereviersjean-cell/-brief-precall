import {
  getHubspotLinkedCalls,
  getOrganizationDealRules,
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
import { MAX_STAGES, type DealRules } from "./deal-rules";
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
  // Les règles des deals du client (méthode, objectifs de chaque rendez-vous,
  // seuils, critères par étape), réglées dans le même call.
  rules: DealRules;
  // Le nom de chaque étape de son pipeline principal (celui qui a le plus de
  // deals), pour les critères par étape ; vide hors HubSpot.
  stageLabels: Record<number, string>;
  calls: { id: string; meeting_title: string | null; started_at: string | null; created_at: string; dealName: string | null }[];
};

function sampleValue(value: string | null, options: { label: string; value: string }[]): string {
  const label = options.find((o) => o.value === value)?.label ?? value ?? "";
  return label.length > 80 ? `${label.slice(0, 79)}…` : label;
}

export async function loadHubspotSetup(organizationId: string): Promise<HubspotSetupData> {
  const [hubspotUser, orgMapping, autoPush, calls, rules] = await Promise.all([
    getHubspotUserForOrganization(organizationId, []),
    getOrganizationHubspotMapping(organizationId),
    isHubspotAutoPushEnabled(organizationId),
    getHubspotLinkedCalls(organizationId).catch(() => []),
    getOrganizationDealRules(organizationId),
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
      rules,
      stageLabels: {},
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
  const withCounts = pipelines.map((p) => ({ ...p, stages: p.stages.map((s) => ({ ...s, count: counts.get(`${p.id}/${s.id}`) ?? 0 })) }));
  const main = [...withCounts].sort((a, b) => b.stages.reduce((n, s) => n + s.count, 0) - a.stages.reduce((n, s) => n + s.count, 0))[0];
  // Même numérotation que la photo d'un deal (position dans le pipeline).
  const stageLabels: Record<number, string> = {};
  main?.stages.forEach((s, i) => {
    if (!s.closed && i < MAX_STAGES) stageLabels[i + 1] = s.label;
  });

  return {
    connected: true,
    connectedAs,
    portalId,
    canCreateProperties: scopes.includes("crm.schemas.deals.write"),
    dealsAnalyzed: deals.length,
    pipelines: withCounts,
    properties,
    proposals,
    verdict: methodVerdict(proposals),
    current,
    rules,
    stageLabels,
    calls,
  };
}
