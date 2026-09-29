import { supabaseAdmin } from "./supabase";
import { MODULES, type ModuleKey } from "./modules";
import { getClientDetail, type ClientDetail } from "./clients-overview";
import {
  computeParcours,
  evaluateCriterion,
  PARCOURS_STEPS,
  stepsForReview,
  type CriterionInput,
  type CriterionResult,
  type ParcoursStep,
} from "./parcours";
import { getEffectiveScoresForDisplay, type ScoresDict } from "./playbook-scores";
import type { PlaybookSnapshot } from "./db";

// Rapport de préparation du point hebdomadaire (document « Brief — Parcours
// client type », section « Le point hebdomadaire ») : tout ce que l'account
// manager doit savoir avant son call avec le client, rangé dans l'ordre du
// déroulé — le constat, le module de la semaine, l'action pour la semaine
// suivante, les blocages. Les chiffres portent sur les 7 derniers jours,
// comparés aux 7 précédents.
//
// Lecture seule. Chaque requête annexe tombe sur une valeur vide en cas
// d'erreur plutôt que de faire échouer la page : un rapport partiel reste
// utile dix minutes avant un point, une page d'erreur non.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type ReviewCall = {
  id: string;
  userId: string;
  userLabel: string;
  title: string;
  createdAt: string;
  score: number | null;
  summary: string | null;
  strength: string | null;
  weakness: string | null;
};

export type ReviewMemberRow = {
  id: string;
  label: string;
  role: "manager" | "commercial" | null;
  status: "active" | "invited" | "disabled";
  calls: number;
  callsPrev: number;
  avgScore: number | null;
  avgScorePrev: number | null;
  briefs: number;
  lastSeenAt: string | null;
  agenda: "connected" | "disconnected" | "missing";
};

export type ReviewObjection = {
  label: string;
  thisWeek: number;
  prevWeek: number;
  // Première occurrence dans les 7 derniers jours.
  isNew: boolean;
};

export type ReviewFinding = { text: string; source: string };

export type ReviewBlocker = { severity: "danger" | "warning"; text: string };

export type ClientReview = {
  detail: ClientDetail;
  generatedAt: string;
  // Semaine du parcours au moment du point (prochain point, ou maintenant).
  reviewWeek: number | null;
  totals: {
    calls: number;
    callsPrev: number;
    briefs: number;
    briefsPrev: number;
    avgScore: number | null;
    avgScorePrev: number | null;
    activeMembers: number;
    upcomingMeetings: number;
  };
  findings: ReviewFinding[];
  // Null hors parcours (client antérieur, tout ouvert) ou sans date de début.
  step: {
    present: ParcoursStep;
    presentResult: CriterionResult;
    gate: ParcoursStep | null;
    gateResult: CriterionResult | null;
    // Modules de l'étape pas encore ouverts.
    toOpen: { key: ModuleKey; label: string }[];
    // Ce que le module contient déjà : il n'arrive jamais vide.
    readiness: string[];
  } | null;
  checklist: { step: ParcoursStep; result: CriterionResult; reached: boolean }[];
  members: ReviewMemberRow[];
  objections: ReviewObjection[];
  showcase: { best: ReviewCall | null; instructive: ReviewCall | null };
  blockers: ReviewBlocker[];
  closedModules: { key: ModuleKey; label: string; description: string; week: number | null }[];
};

type CallRow = {
  id: string;
  user_id: string;
  created_at: string;
  meeting_title: string | null;
  company_name: string | null;
  contact_email: string | null;
  call_analysis: AnalysisRow | AnalysisRow[] | null;
};

type AnalysisRow = {
  scores: (ScoresDict & { global_score?: number }) | null;
  next_steps: string[] | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  playbook_snapshot: PlaybookSnapshot | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

// Une note de 0 sur une échelle de 1 à 5 veut dire « rien d'évaluable »
// (transcript vide ou corrompu) : ce n'est pas une contre-performance, et un
// tel call ne doit ni tirer la moyenne ni sortir comme call à montrer.
function globalScore(analysis: AnalysisRow | null): number | null {
  const score = analysis?.scores?.global_score;
  return typeof score === "number" && score > 0 ? score : null;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

function formatScore(score: number): string {
  return score.toFixed(1).replace(".", ",");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

// Rend `fallback` si la requête échoue : voir l'en-tête du fichier.
async function orEmpty<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T): Promise<T> {
  const res = await query;
  return res.error ? fallback : ((res.data ?? fallback) as T);
}

async function orZero(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const res = await query;
  return res.error ? 0 : res.count ?? 0;
}

export async function getClientReview(organizationId: string, now: Date = new Date()): Promise<ClientReview | null> {
  const detail = await getClientDetail(organizationId, now);
  if (!detail) return null;
  const { overview } = detail;

  const since = new Date(now.getTime() - WEEK_MS).toISOString();
  const sincePrev = new Date(now.getTime() - 2 * WEEK_MS).toISOString();
  const inAWeek = new Date(now.getTime() + WEEK_MS).toISOString();

  const members = detail.members.filter((m) => m.status !== "disabled");
  const ids = members.map((m) => m.id);
  const labelOf = new Map(detail.members.map((m) => [m.id, m.name?.trim() || m.email]));
  const none = ["00000000-0000-0000-0000-000000000000"]; // `.in()` vide = erreur PostgREST
  const memberIds = ids.length ? ids : none;

  const [
    calls,
    briefRows,
    analyzedCalls,
    followUpsSent,
    followUpsDrafted,
    talkRows,
    objectionRows,
    categories,
    playbooks,
    crmRows,
    trainingRows,
    tasks,
    upcomingMeetings,
  ] = await Promise.all([
    orEmpty<CallRow[]>(
      supabaseAdmin
        .from("calls")
        .select(
          "id, user_id, created_at, meeting_title, company_name, contact_email, call_analysis(scores, next_steps, summary, strengths, weaknesses, playbook_snapshot)"
        )
        .in("user_id", memberIds)
        .gte("created_at", sincePrev)
        .order("created_at", { ascending: false }),
      []
    ),
    // Tous les briefs (critère « chaque commercial a au moins un brief ») :
    // la date sert aux compteurs de la semaine.
    orEmpty<{ user_id: string; created_at: string }[]>(
      supabaseAdmin.from("briefs").select("user_id, created_at").in("user_id", memberIds),
      []
    ),
    orZero(
      supabaseAdmin.from("calls").select("id, call_analysis!inner(id)", { count: "exact", head: true }).in("user_id", memberIds)
    ),
    orZero(
      supabaseAdmin.from("calls").select("id", { count: "exact", head: true }).in("user_id", memberIds).not("follow_up_sent_at", "is", null)
    ),
    orZero(
      supabaseAdmin.from("calls").select("id", { count: "exact", head: true }).in("user_id", memberIds).not("follow_up_email", "is", null)
    ),
    orEmpty<{ talk_ratio_pct: number | null }[]>(
      supabaseAdmin.from("call_analytics").select("talk_ratio_pct").eq("organization_id", organizationId).gte("occurred_at", since),
      []
    ),
    orEmpty<{ category_id: string | null; created_at: string }[]>(
      supabaseAdmin.from("call_objections").select("category_id, created_at").eq("organization_id", organizationId),
      []
    ),
    orEmpty<{ id: string; label: string; handling_guidance: string | null }[]>(
      supabaseAdmin.from("objection_categories").select("id, label, handling_guidance").eq("organization_id", organizationId),
      []
    ),
    orEmpty<{ id: string }[]>(supabaseAdmin.from("playbooks").select("id").eq("organization_id", organizationId).limit(1), []),
    orEmpty<{ provider: string }[]>(
      supabaseAdmin.from("crm_connections").select("provider").in("user_id", memberIds).in("provider", ["hubspot", "pipedrive"]),
      []
    ),
    orEmpty<{ user_id: string }[]>(supabaseAdmin.from("training_sessions").select("user_id").eq("organization_id", organizationId), []),
    orZero(supabaseAdmin.from("tasks").select("id", { count: "exact", head: true }).in("user_id", memberIds)),
    orZero(
      supabaseAdmin
        .from("scheduled_meetings")
        .select("id", { count: "exact", head: true })
        .in("user_id", memberIds)
        .gte("event_start_at", now.toISOString())
        .lt("event_start_at", inAWeek)
    ),
  ]);

  const isThisWeek = (iso: string) => iso >= since;
  const isPrevWeek = (iso: string) => iso >= sincePrev && iso < since;

  // ─── Calls ────────────────────────────────────────────────────────────────
  const thisWeekCalls = calls.filter((c) => isThisWeek(c.created_at));
  const prevWeekCalls = calls.filter((c) => isPrevWeek(c.created_at));
  const scored = (list: CallRow[]) =>
    list.map((c) => globalScore(one(c.call_analysis))).filter((s): s is number => s !== null);

  const briefsThisWeek = briefRows.filter((b) => isThisWeek(b.created_at));
  const briefsPrevWeek = briefRows.filter((b) => isPrevWeek(b.created_at));

  const toReviewCall = (c: CallRow): ReviewCall => {
    const a = one(c.call_analysis);
    return {
      id: c.id,
      userId: c.user_id,
      userLabel: labelOf.get(c.user_id) ?? "—",
      title: c.meeting_title?.trim() || c.company_name?.trim() || c.contact_email || "Rendez-vous",
      createdAt: c.created_at,
      score: globalScore(a),
      summary: a?.summary ?? null,
      strength: a?.strengths?.[0] ?? null,
      weakness: a?.weaknesses?.[0] ?? null,
    };
  };

  const rankable = thisWeekCalls.filter((c) => globalScore(one(c.call_analysis)) !== null).map(toReviewCall);
  rankable.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = rankable[0] ?? null;
  const instructive = rankable.length >= 2 ? rankable[rankable.length - 1] : null;

  // ─── Membres ──────────────────────────────────────────────────────────────
  const memberRows: ReviewMemberRow[] = members.map((m) => {
    const mine = (list: CallRow[]) => list.filter((c) => c.user_id === m.id);
    return {
      id: m.id,
      label: labelOf.get(m.id) ?? m.email,
      role: m.role,
      status: m.status,
      calls: mine(thisWeekCalls).length,
      callsPrev: mine(prevWeekCalls).length,
      avgScore: average(scored(mine(thisWeekCalls))),
      avgScorePrev: average(scored(mine(prevWeekCalls))),
      briefs: briefsThisWeek.filter((b) => b.user_id === m.id).length,
      lastSeenAt: m.lastSeenAt,
      agenda: m.agenda,
    };
  });

  // ─── Objections ───────────────────────────────────────────────────────────
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byCategory = new Map<string, { label: string; total: number; thisWeek: number; prevWeek: number; first: string }>();
  for (const row of objectionRows) {
    const key = row.category_id ?? "none";
    const label = row.category_id ? categoryById.get(row.category_id)?.label ?? "Catégorie supprimée" : "Non classée";
    const entry = byCategory.get(key) ?? { label, total: 0, thisWeek: 0, prevWeek: 0, first: row.created_at };
    entry.total++;
    if (isThisWeek(row.created_at)) entry.thisWeek++;
    if (isPrevWeek(row.created_at)) entry.prevWeek++;
    if (row.created_at < entry.first) entry.first = row.created_at;
    byCategory.set(key, entry);
  }
  const objections: ReviewObjection[] = [...byCategory.values()]
    .filter((o) => o.thisWeek > 0)
    .sort((a, b) => b.thisWeek - a.thisWeek || b.thisWeek - b.prevWeek - (a.thisWeek - a.prevWeek))
    .map((o) => ({ label: o.label, thisWeek: o.thisWeek, prevWeek: o.prevWeek, isNew: isThisWeek(o.first) }));

  const topObjections = [...byCategory.entries()]
    .filter(([key]) => key !== "none")
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([key, o]) => ({ label: o.label, answered: !!categoryById.get(key)?.handling_guidance?.trim() }));

  // ─── Parcours ─────────────────────────────────────────────────────────────
  const trainingByUser = new Map<string, number>();
  for (const row of trainingRows) trainingByUser.set(row.user_id, (trainingByUser.get(row.user_id) ?? 0) + 1);

  const criterionInput: CriterionInput = {
    members: members
      .filter((m): m is typeof m & { status: "active" | "invited" } => m.status === "active" || m.status === "invited")
      .map((m) => ({
        label: labelOf.get(m.id) ?? m.email,
        role: m.role,
        status: m.status,
        agenda: m.agenda,
        briefs: briefRows.filter((b) => b.user_id === m.id).length,
        trainingSessions: trainingByUser.get(m.id) ?? 0,
      })),
    analyzedCalls,
    playbookDefined: playbooks.length > 0,
    followUpsSent,
    topObjections,
    crmConnected: crmRows.length > 0,
  };

  const reviewAt =
    overview.nextReviewAt && new Date(overview.nextReviewAt).getTime() > now.getTime() ? new Date(overview.nextReviewAt) : now;
  const reviewWeek = computeParcours(overview.parcoursStartedAt, overview.modules, reviewAt).week;

  let step: ClientReview["step"] = null;
  if (overview.inParcours && reviewWeek !== null) {
    const { present, gate } = stepsForReview(reviewWeek, overview.parcours.nextModule?.week ?? null);
    step = {
      present,
      presentResult: evaluateCriterion(present.week, criterionInput),
      gate,
      gateResult: gate ? evaluateCriterion(gate.week, criterionInput) : null,
      toOpen: present.modules
        .filter((key) => !overview.modules.includes(key))
        .map((key) => ({ key, label: MODULES.find((m) => m.key === key)?.label ?? key })),
      readiness: readinessFor(present.week, {
        upcomingMeetings,
        briefsThisWeek: briefsThisWeek.length,
        analyzedCalls,
        followUpsDrafted,
        objectionsTotal: objectionRows.length,
        topObjections: topObjections.map((o) => o.label),
        crmConnected: criterionInput.crmConnected,
        tasks,
        trainingSessions: trainingRows.length,
      }),
    };
  }

  const lastReached = step?.present.week ?? -1;
  const checklist = overview.inParcours
    ? PARCOURS_STEPS.map((s) => ({ step: s, result: evaluateCriterion(s.week, criterionInput), reached: s.week <= lastReached }))
    : [];

  // ─── Constats ─────────────────────────────────────────────────────────────
  const findings: ReviewFinding[] = [];
  const analyzedThisWeek = thisWeekCalls.map((c) => one(c.call_analysis)).filter((a): a is AnalysisRow => a !== null);

  const withoutNextStep = analyzedThisWeek.filter((a) => (a.next_steps ?? []).length === 0).length;
  if (analyzedThisWeek.length > 0 && withoutNextStep > 0) {
    findings.push({
      text:
        analyzedThisWeek.length === 1
          ? "Le seul call de la semaine s'est terminé sans prochaine étape fixée."
          : `${withoutNextStep} de vos ${analyzedThisWeek.length} calls ${withoutNextStep > 1 ? "se sont terminés" : "s'est terminé"} sans prochaine étape fixée.`,
      source: "Prochaines étapes relevées par l'analyse, 7 derniers jours.",
    });
  }

  const dimensionScores = new Map<string, number[]>();
  for (const a of analyzedThisWeek) {
    for (const item of getEffectiveScoresForDisplay({ scores: a.scores, playbook_snapshot: a.playbook_snapshot }).filter((i) => i.score > 0)) {
      const list = dimensionScores.get(item.label) ?? [];
      list.push(item.score);
      dimensionScores.set(item.label, list);
    }
  }
  const weakest = [...dimensionScores.entries()]
    .map(([label, scores]) => ({ label, avg: average(scores) ?? 0, n: scores.length }))
    .sort((a, b) => a.avg - b.avg)[0];
  if (weakest && dimensionScores.size > 1) {
    findings.push({
      text: `L'étape la plus faible de la semaine est « ${weakest.label} » : ${formatScore(weakest.avg)}/5 en moyenne sur ${plural(weakest.n, "call", "calls")}.`,
      source: "Scores par étape, 7 derniers jours.",
    });
  }

  const avgScore = average(scored(thisWeekCalls));
  const avgScorePrev = average(scored(prevWeekCalls));
  if (avgScore !== null && avgScorePrev !== null && Math.abs(avgScore - avgScorePrev) >= 0.2) {
    const up = avgScore > avgScorePrev;
    findings.push({
      text: `Le score moyen de l'équipe ${up ? "monte" : "baisse"} : ${formatScore(avgScorePrev)} → ${formatScore(avgScore)}/5 d'une semaine sur l'autre.`,
      source: "Score global des calls analysés.",
    });
  }

  const talk = average(talkRows.map((r) => r.talk_ratio_pct).filter((v): v is number => typeof v === "number"));
  if (talk !== null && talk >= 55) {
    findings.push({
      text: `Vos commerciaux parlent ${Math.round(talk)} % du temps en rendez-vous : le prospect n'a que ${100 - Math.round(talk)} %.`,
      source: "Temps de parole mesuré sur les transcripts, 7 derniers jours.",
    });
  }

  if (overview.modules.includes("objections") && objections[0]) {
    findings.push({
      text: `L'objection « ${objections[0].label} » est revenue ${plural(objections[0].thisWeek, "fois", "fois")} cette semaine.`,
      source: "Objections classées, 7 derniers jours.",
    });
  }

  // ─── Blocages ─────────────────────────────────────────────────────────────
  const blockers: ReviewBlocker[] = [];
  for (const m of detail.members) {
    const label = labelOf.get(m.id) ?? m.email;
    if (m.status === "invited") blockers.push({ severity: "warning", text: `${label} n'a pas encore accepté son invitation.` });
    if (m.status !== "active") continue;
    if (m.agenda === "disconnected") {
      blockers.push({
        severity: "danger",
        text: `L'agenda de ${label} est coupé${m.agendaSince ? ` depuis le ${formatDate(m.agendaSince)}` : ""} : aucun rendez-vous n'est plus enregistré.`,
      });
    } else if (m.agenda === "missing") {
      blockers.push({ severity: "warning", text: `${label} n'a pas branché son agenda.` });
    }
    const inactive =
      (m.lastSeenAt == null || now.getTime() - new Date(m.lastSeenAt).getTime() >= WEEK_MS) && m.calls7d + m.briefs7d === 0;
    if (inactive) {
      blockers.push({
        severity: "warning",
        // last_seen_at n'est suivi que depuis le 29/09/2026 (migration 018) :
        // son absence ne prouve pas que la personne ne s'est jamais connectée.
        text: `${label} est inactif : ${m.lastSeenAt ? `dernière connexion le ${formatDate(m.lastSeenAt)}` : "aucune connexion enregistrée"}, aucun brief ni call cette semaine.`,
      });
    }
  }
  for (const alert of overview.alerts) {
    if (alert.kind === "billing" || alert.kind === "module_late") blockers.push({ severity: alert.severity, text: `${alert.label}.` });
  }

  return {
    detail,
    generatedAt: now.toISOString(),
    reviewWeek,
    totals: {
      calls: thisWeekCalls.length,
      callsPrev: prevWeekCalls.length,
      briefs: briefsThisWeek.length,
      briefsPrev: briefsPrevWeek.length,
      avgScore,
      avgScorePrev,
      activeMembers: memberRows.filter((m) => m.status === "active" && m.calls + m.briefs > 0).length,
      upcomingMeetings,
    },
    findings,
    step,
    checklist,
    members: memberRows,
    objections,
    showcase: { best, instructive },
    blockers,
    closedModules: MODULES.filter((m) => !overview.modules.includes(m.key))
      .sort((a, b) => (a.week ?? 99) - (b.week ?? 99))
      .map((m) => ({ key: m.key, label: m.label, description: m.description, week: m.week })),
  };
}

// Ce que l'étape a déjà à montrer, avec les données du client.
function readinessFor(
  week: number,
  d: {
    upcomingMeetings: number;
    briefsThisWeek: number;
    analyzedCalls: number;
    followUpsDrafted: number;
    objectionsTotal: number;
    topObjections: string[];
    crmConnected: boolean;
    tasks: number;
    trainingSessions: number;
  }
): string[] {
  switch (week) {
    case 0:
      return [`${plural(d.upcomingMeetings, "rendez-vous repéré", "rendez-vous repérés")} dans les agendas pour les 7 prochains jours.`];
    case 1:
      return [`${plural(d.briefsThisWeek, "brief préparé", "briefs préparés")} ces 7 derniers jours.`];
    case 2:
    case 3:
      // Semaine 3 : pas de renotation des calls passés (décision du
      // 29/09/2026) — seuls les suivants le seront sur sa grille.
      return [
        week === 3
          ? `${plural(d.analyzedCalls, "call déjà noté", "calls déjà notés")} sur la grille par défaut ; les suivants le seront sur la sienne.`
          : `${plural(d.analyzedCalls, "call analysé", "calls analysés")} depuis le début.`,
      ];
    case 4:
      return [`${plural(d.followUpsDrafted, "email de suivi déjà rédigé", "emails de suivi déjà rédigés")}, prêts à montrer.`];
    case 5:
      return [
        `${plural(d.objectionsTotal, "objection déjà repérée", "objections déjà repérées")}.`,
        ...(d.topObjections.length ? [`Les plus fréquentes : ${d.topObjections.map((l) => `« ${l} »`).join(", ")}.`] : []),
      ];
    case 6:
      return [
        d.crmConnected ? "Un CRM est déjà connecté." : "Aucun CRM connecté : à brancher pendant le point.",
        `${plural(d.tasks, "tâche déjà créée", "tâches déjà créées")}.`,
      ];
    case 7:
      return [
        `${plural(d.objectionsTotal, "objection réelle", "objections réelles")} sur ${d.objectionsTotal > 1 ? "lesquelles" : "laquelle"} s'entraîner.`,
        `${plural(d.trainingSessions, "session déjà faite", "sessions déjà faites")}.`,
      ];
    default:
      return [`${plural(d.analyzedCalls, "call analysé", "calls analysés")} depuis le début du parcours.`];
  }
}
