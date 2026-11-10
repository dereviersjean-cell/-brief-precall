import type { DealProgress } from "./deal-progress";

// Prévision de chiffre d'affaires (maquette C1 choisie par Jean le
// 10/11/2026) : pour chaque deal ouvert rattaché à HubSpot, ce que HubSpot
// prévoit (montant × probabilité de l'étape) et ce que Brief prévoit d'après
// les calls. Sans dépendance, importable côté client.
//
// La règle de Brief : partir de la probabilité HubSpot et la plafonner quand
// les calls ne la confirment pas. Le plafond le plus bas l'emporte et donne
// la raison affichée. Brief ne monte jamais au-dessus de HubSpot.
const CAPS = {
  overdueLong: 10, // date de clôture dépassée de plus de 14 jours
  overdue: 25, // date de clôture dépassée
  lateStep: 30, // la suite convenue au dernier call est passée sans nouveau call
  idle: 30, // aucun call depuis le seuil d'inactivité
  setback: 40, // le deal recule (objection qui revient, décideur toujours absent…)
  noNextStep: 50, // dernier call sans prochaine étape datée
  noDecisionMaker: 60, // décideur pas identifié clairement
  noBudget: 70, // budget pas confirmé
} as const;

export type ForecastDeal = {
  id: string;
  name: string;
  amount: number;
  // Jour de clôture prévu dans HubSpot (AAAA-MM-JJ).
  closeDate: string;
  hubspotPct: number;
  briefPct: number;
  why: string;
  // Ce que le manager peut demander au commercial ; vide quand les calls
  // confirment HubSpot.
  ask: string;
};

export type ForecastPerson = {
  id: string;
  name: string;
  avatarUrl: string | null;
  deals: ForecastDeal[];
  // Deals gagnés dans HubSpot : montant et jour de clôture.
  signed: { amount: number; closeDate: string }[];
  // Deals ouverts que la prévision ne peut pas compter : pas de deal HubSpot,
  // pas de montant ou pas de date de clôture.
  uncounted: number;
};

export type ForecastPeriod = { key: "month" | "quarter"; button: string; title: string; start: string; end: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);
}

export function isWon(d: DealProgress): boolean {
  const h = d.hubspot;
  return !!h?.closed && (h.probability === 1 || h.stageId === "closedwon");
}

// Le deal dans la prévision ; null s'il ne peut pas être compté. `today` est
// le jour à Paris (AAAA-MM-JJ).
export function forecastDeal(d: DealProgress, today: string, ask: string): ForecastDeal | null {
  const h = d.hubspot;
  if (!h || h.closed || !h.amount || h.amount <= 0 || !h.closeDate || h.probability == null) return null;
  const closeDate = h.closeDate.slice(0, 10);
  const hubspotPct = Math.round(h.probability * 100);

  const caps: { pct: number; why: string }[] = [];
  const late = daysBetween(closeDate, today);
  if (late > 0) {
    caps.push({ pct: late > 14 ? CAPS.overdueLong : CAPS.overdue, why: `Date de clôture dépassée de ${late} jour${late > 1 ? "s" : ""} dans HubSpot.` });
  }
  if (d.nextStep.status === "en_retard") {
    caps.push({ pct: CAPS.lateStep, why: `La suite convenue au dernier call n'a pas eu lieu${d.nextStep.text ? ` : ${d.nextStep.text.replace(/[\s.;]+$/, "")}` : ""}.` });
  }
  if (d.verdict === "recul") {
    caps.push({ pct: CAPS.setback, why: d.topAlert?.text ?? `${d.reasons[0] ?? "Le deal recule"}.` });
  } else if (d.verdict === "arret") {
    const idle = d.reasons.find((r) => r.startsWith("Aucun call"));
    caps.push(idle ? { pct: CAPS.idle, why: `${idle}.` } : { pct: CAPS.noNextStep, why: "Le dernier call s'est terminé sans prochaine étape datée." });
  }
  const known = (key: string) => d.checklist.find((c) => c.key === key)?.known;
  if (known("decideur") === false) caps.push({ pct: CAPS.noDecisionMaker, why: "Le décideur n'est pas clairement identifié dans les calls." });
  if (known("budget") === false) caps.push({ pct: CAPS.noBudget, why: "Le budget n'a pas été confirmé par le prospect." });

  const lowest = caps.filter((c) => c.pct < hubspotPct).sort((a, b) => a.pct - b.pct)[0];
  return {
    id: d.id,
    name: d.name,
    amount: h.amount,
    closeDate,
    hubspotPct,
    briefPct: lowest ? lowest.pct : hubspotPct,
    why: lowest ? lowest.why : "Les calls ne contredisent pas l'étape HubSpot.",
    ask: lowest ? ask : "",
  };
}

// Le mois et le trimestre en cours, à Paris.
export function forecastPeriods(today: string): ForecastPeriod[] {
  const [y, m] = today.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (month: number) => new Date(Date.UTC(y, month, 0)).getUTCDate();
  const monthName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
  const q = Math.ceil(m / 3);
  const qEnd = q * 3;
  return [
    {
      key: "month",
      button: "Ce mois",
      title: `Prévision ${/^[aeiouyhàâéèêîôû]/i.test(monthName) ? "d'" : "de "}${monthName}`,
      start: `${y}-${pad(m)}-01`,
      end: `${y}-${pad(m)}-${pad(lastDay(m))}`,
    },
    {
      key: "quarter",
      button: "Ce trimestre",
      title: `Prévision du ${q === 1 ? "1er" : `${q}e`} trimestre`,
      start: `${y}-${pad(qEnd - 2)}-01`,
      end: `${y}-${pad(qEnd)}-${pad(lastDay(qEnd))}`,
    },
  ];
}

export type ForecastTotals = { count: number; pipeline: number; hubspot: number; brief: number; signed: number };

// Les deals ouverts dont la clôture est prévue d'ici la fin de la période
// (ceux dont la date est déjà passée restent comptés : HubSpot les garde
// ouverts), et les deals signés dans la période.
export function inPeriod(person: ForecastPerson, period: ForecastPeriod): { deals: ForecastDeal[]; totals: ForecastTotals } {
  const deals = person.deals.filter((d) => d.closeDate <= period.end).sort((a, b) => b.amount * b.briefPct - a.amount * a.briefPct);
  return {
    deals,
    totals: {
      count: deals.length,
      pipeline: deals.reduce((n, d) => n + d.amount, 0),
      hubspot: deals.reduce((n, d) => n + (d.amount * d.hubspotPct) / 100, 0),
      brief: deals.reduce((n, d) => n + (d.amount * d.briefPct) / 100, 0),
      signed: person.signed.filter((s) => s.closeDate >= period.start && s.closeDate <= period.end).reduce((n, s) => n + s.amount, 0),
    },
  };
}
