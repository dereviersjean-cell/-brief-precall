import { itemLevel } from "./call-objectives";
import type { DealChronology } from "./deal-chronology";
import type { DealProgress, ProgressFiche } from "./deal-progress";
import type { DealTimeline } from "./deal-timeline";

// La vue Deal « macro » (synthèse produit du 03/11/2026, validée par Jean le
// même jour) : en-tête compact, UNE priorité, les engagements et leur statut,
// l'état du deal en 8 lignes, un historique léger. Sans dépendance serveur :
// la page calcule, l'écran affiche.

const DAY = 24 * 3600 * 1000;

// Les 8 lignes de l'état du deal, dans l'ordre de la synthèse, avec un libellé
// court qui sert aussi aux phrases de l'historique.
export const MACRO_ROWS: { key: string; label: string }[] = [
  { key: "douleur", label: "Douleur" },
  { key: "impact", label: "Impact" },
  { key: "budget", label: "Budget" },
  { key: "decideur", label: "Décideur" },
  { key: "champion", label: "Champion" },
  { key: "processus", label: "Process de décision" },
  { key: "criteres", label: "Critères de décision" },
  { key: "echeance", label: "Échéance" },
];

export type CommitmentStatus = "fait" | "retard" | "a_faire";

export type MacroCommitment = {
  callId: string;
  index: number;
  text: string;
  date: string | null;
  // Un rendez-vous convenu se constate tout seul (le call suivant a eu lieu
  // ou non) ; le reste se coche à la main.
  isMeeting: boolean;
  status: CommitmentStatus;
};

export type MacroStateRow = { key: string; label: string; status: "confirme" | "a_preciser" | "inconnu"; text: string | null };

export type MacroHistoryRow = {
  kind: "call" | "planned";
  date: string | null;
  label: string;
  text: string;
  callId: string | null;
  tone: "done" | "late" | "next";
};

export type DealMacro = {
  rank: number;
  amount: number | null;
  nextMeeting: { date: string; rank: number } | null;
  commitments: MacroCommitment[];
  state: MacroStateRow[];
  // La synthèse du dernier call (04/11/2026) : celle de Haiku, qui connaît le
  // vrai numéro du rendez-vous et ce que le deal savait avant, sinon le
  // résumé de l'analyse. Elle suit le deal : au R2, c'est celle du R2.
  synthesis: { rank: number; date: string | null; callId: string; text: string } | null;
  history: MacroHistoryRow[];
};

// Clé d'un engagement coché : le call qui l'a convenu et sa place dans la
// fiche, plus son texte — une fiche régénérée qui réordonne ses engagements ne
// doit pas cocher le mauvais.
export function commitmentKey(callId: string, index: number, text: string): string {
  return `${callId}#${index}#${text}`;
}

function dayMs(iso: string): number {
  return Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function joinFr(list: string[]): string {
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`;
}

export function buildDealMacro(input: {
  fiches: ProgressFiche[];
  progress: DealProgress;
  timeline: DealTimeline;
  chrono: DealChronology;
  done: Set<string>;
  now: number;
}): DealMacro {
  const { fiches, progress, timeline, chrono, done, now } = input;
  const today = now - (now % DAY);

  // Statut de chaque engagement daté, tel que la chronologie l'a constaté.
  const plannedStatus = new Map(chrono.events.flatMap((e) => (e.kind === "planned" ? [[`${e.date}|${e.text}`, e.status] as const] : [])));
  const statusOf = (callId: string, index: number, text: string, date: string | null): { status: CommitmentStatus; isMeeting: boolean } => {
    const seen = date ? plannedStatus.get(`${date}|${text}`) : undefined;
    const isMeeting = seen !== undefined && seen !== null;
    if (seen === "held") return { status: "fait", isMeeting };
    if (seen === "missed") return { status: "retard", isMeeting };
    if (done.has(commitmentKey(callId, index, text))) return { status: "fait", isMeeting };
    if (date && dayMs(date) < today) return { status: "retard", isMeeting };
    return { status: "a_faire", isMeeting };
  };

  // Engagements : ceux du dernier call, la suite en cours du deal.
  const last = timeline.calls[timeline.calls.length - 1];
  const commitments: MacroCommitment[] = (last?.commitments ?? []).map((c, index) => ({
    callId: last.callId,
    index,
    text: c.text,
    date: c.date,
    ...statusOf(last.callId, index, c.text, c.date),
  }));

  // État du deal : le statut vient de la grille au dernier call, le texte de
  // la fiche la plus récente qui en parle, un élément confirmé de préférence.
  const lastCol = timeline.calls.length - 1;
  const state: MacroStateRow[] = MACRO_ROWS.map((r) => {
    const cell = timeline.grid.find((g) => g.key === r.key)?.cells[lastCol] ?? null;
    let text: string | null = null;
    for (let i = fiches.length - 1; i >= 0 && !text; i--) {
      const items = (fiches[i].fields as Record<string, Parameters<typeof itemLevel>[0][] | undefined>)[r.key];
      if (items?.length) text = (items.find((it) => itemLevel(it) === "confirme") ?? items[0]).text;
    }
    const status = cell === "confirme_ici" || cell === "acquis" ? "confirme" : cell === "evoque" ? "a_preciser" : "inconnu";
    return { key: r.key, label: r.label, status, text };
  });

  // Prochain rendez-vous : le premier rendez-vous convenu encore à venir.
  const upcoming = chrono.events.find((e) => e.kind === "planned" && e.status === "upcoming");
  const nextMeeting = upcoming ? { date: upcoming.date as string, rank: progress.steps.length + 1 } : null;

  // Historique léger : un call = une ligne tournée vers le deal ; un
  // engagement daté = une ligne avec son statut. Un rendez-vous tenu est déjà
  // le call suivant, on ne le répète pas.
  const short = new Map(timeline.grid.map((g) => [lower(g.label), lower(MACRO_ROWS.find((r) => r.key === g.key)?.label ?? g.label)]));
  const sh = (l: string) => short.get(l) ?? l;
  const indexOf = new Map<string, { callId: string; index: number }>();
  for (const call of timeline.calls) call.commitments.forEach((c, index) => indexOf.set(`${c.date}|${c.text}`, { callId: call.callId, index }));

  const history: MacroHistoryRow[] = [];
  for (const e of chrono.events) {
    if (e.kind === "call") {
      const parts: string[] = [];
      const got = e.obtained.map(sh);
      if (got.length) parts.push(`${joinFr(got.slice(0, 3)).replace(/^./, (c) => c.toUpperCase())} ${got.length > 1 ? "confirmés" : "confirmé"}.`);
      if (e.alerts.length) parts.push(`${e.alerts.slice(0, 2).join(" · ")}.`);
      if (e.stillVague.length) parts.push(`Encore à préciser : ${e.stillVague.slice(0, 2).map(sh).join(", ")}.`);
      if (!parts.length) parts.push("Aucune information nouvelle.");
      history.push({ kind: "call", date: e.date, label: `R${e.rank}`, text: parts.join(" "), callId: e.callId, tone: "done" });
      continue;
    }
    if (e.status === "held") continue;
    const at = indexOf.get(`${e.date}|${e.text}`);
    const { status, isMeeting } = at ? statusOf(at.callId, at.index, e.text, e.date) : statusOf("", -1, e.text, e.date);
    const suffix = status === "fait" ? " — fait" : status === "retard" ? (isMeeting ? " — pas eu lieu" : " — action en retard") : "";
    history.push({
      kind: "planned",
      date: e.date,
      label: isMeeting ? "RDV prévu" : "Engagement",
      text: `${e.text}${suffix}`,
      callId: null,
      tone: status === "fait" ? "done" : status === "retard" ? "late" : "next",
    });
  }

  const budget = fiches
    .flatMap((f) => (f.fields.budget ?? []) as { amount?: number | null }[])
    .map((b) => b.amount)
    .filter((a): a is number => typeof a === "number")
    .pop();

  const lastFiche = fiches[fiches.length - 1];
  const synthesisText = lastFiche?.nextQuestions?.advice?.synthesis ?? last?.summary ?? null;
  const synthesis = last && synthesisText ? { rank: last.rank, date: last.at, callId: last.callId, text: synthesisText } : null;

  return {
    rank: progress.steps.length,
    amount: progress.hubspot?.amount ?? budget ?? null,
    nextMeeting,
    commitments,
    state,
    synthesis,
    history,
  };
}

// Un engagement du dernier call en retard (hors rendez-vous, que le conseil
// « relancer » couvre déjà) passe devant le conseil rédigé au moment du call :
// celui-ci ne sait pas que la date est passée.
export function lateCommitment(macro: DealMacro): MacroCommitment | null {
  return macro.commitments.find((c) => c.status === "retard" && !c.isMeeting) ?? null;
}
