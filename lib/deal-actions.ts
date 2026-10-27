import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  type DealMemoryAlert,
  type DealMemoryFieldKey,
  type DealMemoryItem,
  type DealOverview,
  type QuoteSegment,
  type StoredDealMemory,
} from "./deal-memory-schema";
import { REP_ACTIONS, sortByWeight } from "./deal-board";
import { METHODS, type QualificationKey } from "./deal-rules";
import { itemLevel, isVague } from "./call-objectives";

export type { QualificationKey };

// L'analyse d'un call centrée sur le deal, de façon actionnable (demande de
// Jean du 27/10/2026) : ce qu'il faut faire avant le prochain call, et où en
// est la qualification du deal après ce call. Tout est tiré de la fiche par
// des règles fixes, sans appel IA : chaque point renvoie à ce que le call a
// dit. Sans dépendance (réseau, base) : importé par l'écran et testé.

// Les champs qui disent si un deal est qualifié, par défaut (socle +
// MEDDIC). Chaque organisation peut choisir sa méthode (lib/deal-rules.ts) :
// les fonctions ci-dessous prennent alors sa liste en paramètre.
export const QUALIFICATION_FIELDS: readonly QualificationKey[] = METHODS.socle.fields;

export type QualificationRow = {
  key: QualificationKey;
  label: string;
  meddic: string | null;
  // nouveau = appris dans ce call ; precise = déjà connu, ce call ajoute ;
  // connu = connu par un call précédent, pas abordé ici ; manquant = personne
  // n'en a encore parlé.
  status: "nouveau" | "precise" | "connu" | "manquant";
  // Abordé sans réponse nette, sur ce call et les précédents (27/10/2026) :
  // compte comme manquant, l'écran le dit « encore flou ».
  vague: boolean;
  // Ce qu'on en sait de plus récent, jusqu'à ce call compris.
  latest: DealMemoryItem | null;
  latestAt: string | null;
};

type PriorItems = Partial<Record<DealMemoryFieldKey, (DealMemoryItem & { callAt: string | null })[]>>;

// Ce que les calls ANTÉRIEURS à ce call ont retenu, champ par champ, du plus
// récent au plus ancien. Les calls postérieurs sont ignorés : la page d'un
// call dit où en était le deal après CE call.
export function priorItems(deal: DealOverview | null, currentCallId: string): PriorItems {
  if (!deal) return {};
  const index = deal.calls.findIndex((c) => c.callId === currentCallId);
  const before = new Set(deal.calls.slice(0, index < 0 ? 0 : index).map((c) => c.callId));
  const result: PriorItems = {};
  for (const [key, items] of Object.entries(deal.memory) as [DealMemoryFieldKey, NonNullable<DealOverview["memory"][DealMemoryFieldKey]>][]) {
    const kept = items.filter((i) => before.has(i.callId));
    if (kept.length > 0) result[key] = kept;
  }
  return result;
}

const FIELD_DEFS = new Map<string, (typeof DEAL_MEMORY_FIELDS)[number]>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f]));

export function buildQualification(
  fiche: StoredDealMemory,
  prior: PriorItems,
  callAt: string | null,
  fields: readonly QualificationKey[] = QUALIFICATION_FIELDS
): QualificationRow[] {
  return fields.map((key) => {
    const field = FIELD_DEFS.get(key)!;
    // Seul ce que le prospect a dit clairement compte comme connu ; un élément
    // sans niveau (fiche antérieure au 27/10/2026) compte comme avant.
    const nowAll = fiche.fields[key] ?? [];
    const beforeAll = prior[key] ?? [];
    const now = nowAll.filter((i) => itemLevel(i) === "confirme");
    const before = beforeAll.filter((i) => itemLevel(i) === "confirme");
    const status: QualificationRow["status"] =
      now.length > 0 ? (before.length > 0 ? "precise" : "nouveau") : before.length > 0 ? "connu" : "manquant";
    return {
      key,
      label: field.label,
      meddic: field.meddic,
      status,
      vague: status === "manquant" && isVague([...nowAll, ...beforeAll]),
      latest: now[0] ?? before[0] ?? nowAll[0] ?? beforeAll[0] ?? null,
      latestAt: now.length > 0 || (before.length === 0 && nowAll.length > 0) ? callAt : before[0]?.callAt ?? beforeAll[0]?.callAt ?? null,
    };
  });
}

export type ActionRisk = {
  rule: DealMemoryAlert["rule"];
  label: string;
  text: string;
  action: string;
  verbatim: string | null;
  quote?: QuoteSegment[];
};

export type ActionObjection = { objection: string; comment: string | null; verbatim: string | null };

export type ActionPlan = {
  // Ce que chaque partie s'est engagée à faire pendant ce call.
  engagements: DealMemoryItem[];
  // Les alertes du call, chacune avec ce qu'il y a à faire, les plus lourdes
  // d'abord.
  risks: ActionRisk[];
  // Les objections que le commercial n'a pas (ou mal) traitées.
  objections: ActionObjection[];
  // Les cases de qualification encore vides après ce call : à obtenir au
  // prochain. Le décideur n'y figure pas quand une alerte en parle déjà.
  toObtain: { key: QualificationKey; label: string }[];
};

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));
const DECIDER_RULES = new Set(["decideur_absent", "decideur_toujours_absent"]);

export function buildActionPlan(
  fiche: StoredDealMemory,
  objections: { objection: string; handlingQuality: string | null; handlingComment: string | null; verbatim: string | null }[],
  qualification: QualificationRow[]
): ActionPlan {
  const risks = sortByWeight(fiche.alerts).map((a) => ({
    rule: a.rule,
    label: RULE_LABELS.get(a.rule) ?? a.rule,
    text: a.text,
    action: REP_ACTIONS[a.rule],
    verbatim: a.verbatim,
    quote: a.quote,
  }));
  const deciderFlagged = fiche.alerts.some((a) => DECIDER_RULES.has(a.rule));
  return {
    engagements: fiche.fields.prochaines_etapes ?? [],
    risks,
    objections: objections
      .filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement")
      .map((o) => ({ objection: o.objection, comment: o.handlingComment, verbatim: o.verbatim })),
    toObtain: qualification
      .filter((q) => q.status === "manquant" && !(q.key === "decideur" && deciderFlagged))
      .map((q) => ({ key: q.key, label: q.label })),
  };
}
