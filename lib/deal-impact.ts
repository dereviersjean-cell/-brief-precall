import { alertLabel, type BoardRuleKey } from "./deal-board";

// L'effet des alertes (décision du 26/10/2026 : chaque clic « Vu » / « Plus
// tard » est gardé pour le mesurer ; question 15, mesure de réussite du
// pilote) : après qu'un manager a vu un deal signalé, le deal a-t-il eu un
// nouveau call dans les jours qui suivent ? Sans dépendance, testé.

export type ReviewEvent = { dealId: string; status: "seen" | "later"; alertRules: string[]; at: string };

export type AlertImpact = {
  // Deals vus (un par deal et par « Vu », sur la période).
  seen: number;
  // Parmi eux, ceux qui ont eu un nouveau call dans la fenêtre.
  moved: number;
  // Vus trop récemment pour conclure : la fenêtre n'est pas écoulée et
  // aucun call n'est encore venu.
  pending: number;
  // moved / (seen − pending), null sans rien de tranché.
  rate: number | null;
  // Délai moyen entre le « Vu » et le call suivant, en jours.
  avgDays: number | null;
  // Par alerte signalée au moment du « Vu ».
  byRule: { rule: string; label: string; seen: number; moved: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildAlertImpact(events: ReviewEvent[], callsByDeal: Record<string, string[]>, now: number, windowDays: number): AlertImpact {
  const seenEvents = events.filter((e) => e.status === "seen");
  let moved = 0;
  let pending = 0;
  const delays: number[] = [];
  const rules = new Map<string, { seen: number; moved: number }>();
  for (const e of seenEvents) {
    const at = Date.parse(e.at);
    const next = (callsByDeal[e.dealId] ?? []).map((c) => Date.parse(c)).filter((c) => c > at).sort((a, b) => a - b)[0];
    const inWindow = next !== undefined && next - at <= windowDays * DAY_MS;
    const decided = inWindow || now - at > windowDays * DAY_MS;
    if (inWindow) {
      moved++;
      delays.push((next - at) / DAY_MS);
    } else if (!decided) pending++;
    for (const rule of e.alertRules) {
      const entry = rules.get(rule) ?? { seen: 0, moved: 0 };
      entry.seen++;
      if (inWindow) entry.moved++;
      rules.set(rule, entry);
    }
  }
  const decidedCount = seenEvents.length - pending;
  return {
    seen: seenEvents.length,
    moved,
    pending,
    rate: decidedCount > 0 ? moved / decidedCount : null,
    avgDays: delays.length > 0 ? Math.round((delays.reduce((s, d) => s + d, 0) / delays.length) * 10) / 10 : null,
    byRule: [...rules.entries()]
      .map(([rule, v]) => ({ rule, label: alertLabel(rule as BoardRuleKey), ...v }))
      .sort((a, b) => b.seen - a.seen),
  };
}
