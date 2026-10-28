import { DEAL_ALERT_RULES, type DealMemoryAlert, type DealMemoryItem } from "./deal-memory-schema";
import { itemLevel, mergeKnown, reviewCallObjectives, type ItemsByField, type ObjectiveRow } from "./call-objectives";
import { qualificationFields, qualificationLabel, type DealRules, type QualificationKey } from "./deal-rules";

// Le fil d'un deal (demande de Jean du 28/10/2026) : sur la page d'un deal,
// la continuité de tous ses calls — ce que chacun devait aller chercher, ce
// qu'il a obtenu, ce qui a été convenu pour la suite, et le temps passé entre
// deux calls. Plus une grille « information × call » qui montre d'un coup
// d'œil quand chaque information clé est arrivée. Sans dépendance serveur :
// la page la calcule, l'écran l'affiche.

export type TimelineFiche = {
  callId: string;
  callAt: string | null;
  callTitle: string | null;
  ownerId: string;
  fields: ItemsByField;
  alerts: DealMemoryAlert[];
};

// Ce que la base sait du call lui-même, à côté de la fiche deal.
export type CallDetail = {
  durationSeconds: number | null;
  summary: string | null;
  score: number | null;
};

export type TimelineObjection = {
  objection: string;
  handlingQuality: "bien_traitee" | "partiellement" | "non_traitee" | null;
};

export type TimelineCall = {
  rank: number;
  callId: string;
  at: string | null;
  title: string | null;
  ownerId: string;
  // Jours depuis le call précédent ; null pour le premier ou sans date.
  gapDays: number | null;
  durationMinutes: number | null;
  score: number | null;
  summary: string | null;
  // Les objectifs du rendez-vous et ce qu'il en est sorti.
  objectives: ObjectiveRow[];
  // Les informations clés confirmées pour la première fois à ce call, objectif
  // ou non.
  obtained: string[];
  // Ce que chaque partie s'est engagée à faire après ce call.
  commitments: { text: string; date: string | null }[];
  alerts: { rule: string; label: string }[];
  objections: TimelineObjection[];
};

// confirme_ici = confirmé pour la première fois à ce call ; acquis = confirmé
// avant ; evoque = abordé sans réponse nette, à ce call ou avant ; null =
// jamais abordé jusque-là.
export type GridCell = "confirme_ici" | "acquis" | "evoque" | null;

export type TimelineGrid = {
  key: QualificationKey;
  label: string;
  cells: GridCell[];
}[];

export type DealTimeline = {
  calls: TimelineCall[];
  grid: TimelineGrid;
  // Du premier au dernier call, en jours ; null sans dates.
  spanDays: number | null;
};

const ALERT_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));
const DAY = 24 * 60 * 60 * 1000;

function level(items: DealMemoryItem[] | undefined): "confirme" | "evoque" | null {
  if (!items || items.length === 0) return null;
  return items.some((i) => itemLevel(i) === "confirme") ? "confirme" : "evoque";
}

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / DAY)) : null;
}

// `fiches` dans l'ordre des calls, le plus ancien d'abord.
export function buildDealTimeline(
  fiches: TimelineFiche[],
  rules: DealRules,
  details: Record<string, CallDetail> = {},
  objectionsByCall: Record<string, TimelineObjection[]> = {}
): DealTimeline {
  const keys = qualificationFields(rules);
  const grid: TimelineGrid = keys.map((key) => ({
    key,
    label: qualificationLabel(key),
    cells: [],
  }));
  const calls: TimelineCall[] = fiches.map((fiche, i) => {
    const prior = mergeKnown(fiches.slice(0, i).map((f) => f.fields));
    const obtained: string[] = [];
    grid.forEach((row) => {
      const before = level(prior[row.key]);
      const now = level(fiche.fields[row.key]);
      if (before !== "confirme" && now === "confirme") obtained.push(row.label);
      row.cells.push(before === "confirme" ? "acquis" : now === "confirme" ? "confirme_ici" : before || now ? "evoque" : null);
    });
    const detail = details[fiche.callId];
    return {
      rank: i + 1,
      callId: fiche.callId,
      at: fiche.callAt,
      title: fiche.callTitle,
      ownerId: fiche.ownerId,
      gapDays: i === 0 ? null : daysBetween(fiches[i - 1].callAt, fiche.callAt),
      durationMinutes: detail?.durationSeconds ? Math.max(1, Math.round(detail.durationSeconds / 60)) : null,
      score: detail?.score ?? null,
      summary: detail?.summary?.trim() || null,
      objectives: reviewCallObjectives({
        rank: i + 1,
        current: fiche.fields,
        prior,
        rules,
      }),
      obtained,
      commitments: (fiche.fields.prochaines_etapes ?? []).map((c) => ({
        text: c.text,
        date: c.date ?? null,
      })),
      alerts: fiche.alerts.map((a) => ({
        rule: a.rule,
        label: ALERT_LABELS.get(a.rule) ?? a.rule,
      })),
      objections: objectionsByCall[fiche.callId] ?? [],
    };
  });
  return {
    calls,
    grid,
    spanDays: fiches.length > 1 ? daysBetween(fiches[0].callAt, fiches[fiches.length - 1].callAt) : null,
  };
}
