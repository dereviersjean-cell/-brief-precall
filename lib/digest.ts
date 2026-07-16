import Anthropic from "@anthropic-ai/sdk";
import {
  getCommercialDigestData,
  getManagerDigestData,
  getCommercialsForManager,
  getDigestCallInsights,
  getDigestPendingTasks,
  getDigestPendingQuotes,
  type DigestTiming,
  type DigestRecipient,
  type DigestCallInsight,
  type DigestPendingTask,
  type DigestPendingQuote,
} from "./db";
import { readPromptConfig, DEFAULT_DIGEST_COMMERCIAL_PROMPT, DEFAULT_DIGEST_MANAGER_PROMPT } from "./admin-config";
import { sendCommercialWeeklyDigestEmail, sendManagerWeeklyDigestEmail } from "./email";
import { mostRecentParisMonday } from "./paris-week";

// Module Distribution Flexible, sous-étape 3 (digest hebdo). Entry point for
// the two Inngest crons (lib/inngest-functions.ts) — one per timing value.
// Kept out of lib/db.ts (queries only) and lib/email.ts (rendering/sending
// only), mirroring how lib/notifications-dispatcher.ts sits above
// lib/crm/*.ts and lib/email.ts as the orchestration layer.

const APP_URL = "https://brief-precall.vercel.app";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Week-boundary math (mostRecentParisMonday) lives in lib/paris-week.ts,
// dependency-free on purpose — this file pulls in the Anthropic SDK below,
// and app/dashboard's client components need the week math too (via
// lib/dashboard.ts) without dragging that SDK into the browser bundle.

export type DigestRange = { rangeStart: Date; rangeEnd: Date; prevRangeStart: Date; prevRangeEnd: Date };

// Friday evening: covers Monday of the current week through now (an
// in-progress week, since the digest fires before it's over).
export function fridayEveningDigestRange(now: Date): DigestRange {
  const weekStart = mostRecentParisMonday(now);
  return { rangeStart: weekStart, rangeEnd: now, prevRangeStart: new Date(weekStart.getTime() - 7 * ONE_DAY_MS), prevRangeEnd: weekStart };
}

// Monday morning: "now" is itself the start of the new week, so the digest
// covers the full week that just ended (last Monday through this Monday).
export function mondayMorningDigestRange(now: Date): DigestRange {
  const thisMonday = mostRecentParisMonday(now);
  const lastMonday = new Date(thisMonday.getTime() - 7 * ONE_DAY_MS);
  return { rangeStart: lastMonday, rangeEnd: thisMonday, prevRangeStart: new Date(lastMonday.getTime() - 7 * ONE_DAY_MS), prevRangeEnd: lastMonday };
}

export function digestRangeForTiming(timing: DigestTiming, now: Date): DigestRange {
  return timing === "friday_evening" ? fridayEveningDigestRange(now) : mondayMorningDigestRange(now);
}

function formatPeriodLabel(rangeStart: Date, rangeEnd: Date): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const endFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  // rangeEnd is exclusive (see fetchDigestPeriodStats' `.lt("created_at", toISO)`) — display the last inclusive day.
  const lastDay = new Date(rangeEnd.getTime() - ONE_DAY_MS);
  return `${fmt.format(rangeStart)} – ${endFmt.format(lastDay)}`;
}

type PeriodType = "retrospective" | "prospective";

function periodTypeForTiming(timing: DigestTiming): PeriodType {
  return timing === "friday_evening" ? "retrospective" : "prospective";
}

// Renders one user's slice of raw material as plain text for the prompt —
// reused as-is for the commercial digest (single user) and, with a "###
// <name>" header per commercial, for the manager digest (lib/db.ts's raw
// material queries return flat arrays across the whole team, filtered here
// by user_id rather than queried per-commercial, to keep it 3 batched
// queries total instead of 3-per-commercial).
function formatUserRawMaterial(
  insights: DigestCallInsight[],
  tasks: DigestPendingTask[],
  quotes: DigestPendingQuote[]
): string {
  const lines: string[] = [];

  if (insights.length === 0) {
    lines.push("Aucun call analysé sur la période.");
  } else {
    lines.push(`${insights.length} call(s) analysé(s) :`);
    insights.forEach((insight, idx) => {
      lines.push(`\nCall ${idx + 1}${insight.summary ? ` — ${insight.summary}` : ""}`);
      if (insight.strengths.length) lines.push(`Points forts : ${insight.strengths.join("; ")}`);
      if (insight.weaknesses.length) lines.push(`Points faibles : ${insight.weaknesses.join("; ")}`);
      if (insight.objections.length) lines.push(`Objections rencontrées : ${insight.objections.join("; ")}`);
      if (insight.next_steps.length) lines.push(`Prochaines étapes identifiées : ${insight.next_steps.join("; ")}`);
    });
  }

  lines.push(`\nTâches en attente (${tasks.length}) :`);
  lines.push(tasks.length === 0 ? "Aucune." : tasks.map((t) => `- ${t.title} (échéance ${t.due_at})`).join("\n"));

  lines.push(`\nDevis envoyés en attente de réponse (${quotes.length}) :`);
  lines.push(quotes.length === 0 ? "Aucun." : quotes.map((q) => `- ${q.client_name} (envoyé le ${q.issued_at})`).join("\n"));

  return lines.join("\n");
}

// Plain markdown out, not JSON — same contract as generateKeyPoints
// (lib/key-points.ts): the digest narrative is prose to render through
// renderMarkdownForEmail, not structured data the app needs to parse. Never
// throws — a failed generation just omits the narrative section, the digest
// still sends with its numeric stats.
async function generateDigestNarrative(
  promptKey: "digest_commercial_prompt" | "digest_manager_prompt",
  periodType: PeriodType,
  rawMaterialText: string
): Promise<string | null> {
  try {
    const defaultPrompt = promptKey === "digest_commercial_prompt" ? DEFAULT_DIGEST_COMMERCIAL_PROMPT : DEFAULT_DIGEST_MANAGER_PROMPT;
    const systemPrompt = (await readPromptConfig(promptKey)) ?? defaultPrompt;

    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: `Type de digest : ${periodType}\n\n${rawMaterialText}` }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.trim() : null;
  } catch (err) {
    console.error("[digest] generateDigestNarrative failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export type DigestSendResult = { userId: string; role: DigestRecipient["role"]; outcome: "sent" | "error"; detail?: string };

// Single-user unit of work — called from its own step.run(`send-digest-
// ${user.id}`) inside the Inngest crons (lib/inngest-functions.ts), mirrors
// how syncAndScheduleForUser (lib/recall.ts) is the single-user unit for
// syncRecallCalendars: the cron fetches the population once, then loops
// with one step per user so a single failure only retries that user, not
// the whole batch.
export async function sendWeeklyDigestForUser(user: DigestRecipient, timing: DigestTiming, now: Date): Promise<DigestSendResult> {
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } = digestRangeForTiming(timing, now);
  const periodLabel = formatPeriodLabel(rangeStart, rangeEnd);
  const periodType = periodTypeForTiming(timing);
  const fromISO = rangeStart.toISOString();
  const toISO = rangeEnd.toISOString();

  try {
    if (user.role === "manager") {
      const commercials = await getCommercialsForManager(user.id);
      const commercialIds = commercials.map((c) => c.id);

      const [team, insights, tasks, quotes] = await Promise.all([
        getManagerDigestData(user.id, fromISO, toISO, prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
        getDigestCallInsights(commercialIds, fromISO, toISO),
        getDigestPendingTasks(commercialIds),
        getDigestPendingQuotes(commercialIds),
      ]);

      const rawMaterialText = commercials
        .map((c) => {
          const section = formatUserRawMaterial(
            insights.filter((i) => i.user_id === c.id),
            tasks.filter((t) => t.user_id === c.id),
            quotes.filter((q) => q.user_id === c.id)
          );
          return `### ${c.name ?? c.email}\n${section}`;
        })
        .join("\n\n");

      const narrative = await generateDigestNarrative("digest_manager_prompt", periodType, rawMaterialText);

      await sendManagerWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        periodLabel,
        narrative,
        team,
        teamUrl: `${APP_URL}/team`,
      });
    } else {
      const [stats, insights, tasks, quotes] = await Promise.all([
        getCommercialDigestData(user.id, fromISO, toISO, prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
        getDigestCallInsights([user.id], fromISO, toISO),
        getDigestPendingTasks([user.id]),
        getDigestPendingQuotes([user.id]),
      ]);

      const rawMaterialText = formatUserRawMaterial(insights, tasks, quotes);
      const narrative = await generateDigestNarrative("digest_commercial_prompt", periodType, rawMaterialText);

      await sendCommercialWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        periodLabel,
        narrative,
        stats,
        dashboardUrl: `${APP_URL}/dashboard`,
      });
    }
    return { userId: user.id, role: user.role, outcome: "sent" };
  } catch (err) {
    return { userId: user.id, role: user.role, outcome: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
