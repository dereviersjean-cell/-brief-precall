import type { DealTimeline, TimelineCall } from "./deal-timeline";

// La chronologie d'un deal (demande de Jean du 28/10/2026) : la page entre la
// vue d'ensemble des deals et le détail d'un deal. Elle raconte l'évolution
// dans le temps — chaque call et ce qu'il a fait gagner, les rendez-vous
// convenus et s'ils ont eu lieu, le silence depuis le dernier call — sans le
// détail call par call, qui reste sur la page « détail ». Sans dépendance
// serveur, construite sur le fil des calls (lib/deal-timeline.ts).

const DAY = 24 * 60 * 60 * 1000;
// Un rendez-vous convenu « a eu lieu » si un call du deal tombe à 3 jours
// près de la date prévue : un point glisse souvent d'un jour ou deux.
const HELD_TOLERANCE_DAYS = 3;

// Seuls les engagements qui annoncent une rencontre peuvent être confrontés
// aux calls : « envoyer le devis vendredi » n'est pas un call manqué.
// Bornes de mot Unicode : `\b` ne voit pas le « é » d'« échange ».
const MEETING = /(?<![\p{L}\d])(point|call|rendez-vous|rdv|réunion|reunion|démo|demo|visio|appel|rencontre|atelier|échange|echange|r\d)(?![\p{L}\d])/iu;

export type ChronoCall = {
  kind: "call";
  date: string | null;
  rank: number;
  callId: string;
  // Informations clés obtenues après ce call, et combien il en a apporté.
  known: number;
  gained: number;
  obtained: string[];
  stillVague: string[];
  // La première objection que le commercial n'a pas bien traitée.
  blocker: string | null;
  alerts: string[];
  score: number | null;
  durationMinutes: number | null;
};

// held = un call du deal a eu lieu à cette date ; missed = date passée sans
// call ; upcoming = à venir ; null = engagement sans rencontre, simplement daté.
export type PlannedStatus = "held" | "missed" | "upcoming" | null;

export type ChronoPlanned = {
  kind: "planned";
  date: string;
  text: string;
  // Le call qui l'a convenu.
  fromRank: number;
  status: PlannedStatus;
  heldByRank: number | null;
};

export type ChronoEvent = ChronoCall | ChronoPlanned;

export type DealChronology = {
  events: ChronoEvent[];
  // Pour la courbe : informations clés connues après chaque call daté.
  points: { date: string; known: number; rank: number }[];
  total: number;
  start: string | null;
  // Fin de l'axe : aujourd'hui, ou plus tard si un rendez-vous est prévu après.
  end: string;
  // Jours sans call jusqu'à aujourd'hui ; null sans date.
  silenceDays: number | null;
};

function dayOf(iso: string): number {
  return Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
}

function knownAt(timeline: DealTimeline, index: number): number {
  return timeline.grid.filter((row) => row.cells[index] === "confirme_ici" || row.cells[index] === "acquis").length;
}

function lower(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function callEvent(timeline: DealTimeline, call: TimelineCall, index: number): ChronoCall {
  const known = knownAt(timeline, index);
  return {
    kind: "call",
    date: call.at,
    rank: call.rank,
    callId: call.callId,
    known,
    gained: index === 0 ? known : known - knownAt(timeline, index - 1),
    obtained: call.obtained.map(lower),
    stillVague: timeline.grid.filter((row) => row.cells[index] === "evoque").map((row) => lower(row.label)),
    blocker: call.objections.find((o) => o.handlingQuality !== "bien_traitee")?.objection ?? null,
    alerts: call.alerts.map((a) => a.label),
    score: call.score,
    durationMinutes: call.durationMinutes,
  };
}

export function buildDealChronology(timeline: DealTimeline, now: number): DealChronology {
  const calls = timeline.calls.map((call, i) => callEvent(timeline, call, i));
  const dated = timeline.calls.filter((c) => c.at);

  const planned: ChronoPlanned[] = [];
  const seen = new Set<string>();
  for (const call of timeline.calls) {
    for (const c of call.commitments) {
      if (!c.date || seen.has(`${c.date}|${c.text}`)) continue;
      seen.add(`${c.date}|${c.text}`);
      const due = dayOf(c.date);
      let status: PlannedStatus = null;
      let heldByRank: number | null = null;
      if (MEETING.test(c.text)) {
        const held = dated.find((later) => later.rank > call.rank && Math.abs(dayOf(later.at as string) - due) <= HELD_TOLERANCE_DAYS * DAY);
        if (held) {
          status = "held";
          heldByRank = held.rank;
        } else {
          status = due < now ? "missed" : "upcoming";
        }
      }
      planned.push({ kind: "planned", date: c.date, text: c.text, fromRank: call.rank, status, heldByRank });
    }
  }

  // Dans l'ordre du temps ; à date égale, le call avant ce qu'il a convenu.
  const events: ChronoEvent[] = [...calls, ...planned].sort((a, b) => {
    const da = a.date ? dayOf(a.date) : -Infinity;
    const db = b.date ? dayOf(b.date) : -Infinity;
    return da - db || (a.kind === b.kind ? 0 : a.kind === "call" ? -1 : 1);
  });

  const lastCall = dated[dated.length - 1]?.at ?? null;
  const latestPlanned = planned.reduce((max, p) => Math.max(max, dayOf(p.date)), -Infinity);
  return {
    events,
    points: calls.filter((c) => c.date).map((c) => ({ date: c.date as string, known: c.known, rank: c.rank })),
    total: timeline.grid.length,
    start: dated[0]?.at ?? null,
    end: new Date(Math.max(now, latestPlanned)).toISOString(),
    silenceDays: lastCall ? Math.max(0, Math.floor((now - dayOf(lastCall)) / DAY)) : null,
  };
}
