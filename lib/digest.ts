import { getCommercialDigestData, getManagerDigestData, type DigestTiming, type DigestRecipient } from "./db";
import { sendCommercialWeeklyDigestEmail, sendManagerWeeklyDigestEmail } from "./email";

// Module Distribution Flexible, sous-étape 3 (digest hebdo). Entry point for
// the two Inngest crons (lib/inngest-functions.ts) — one per timing value.
// Kept out of lib/db.ts (queries only) and lib/email.ts (rendering/sending
// only), mirroring how lib/notifications-dispatcher.ts sits above
// lib/crm/*.ts and lib/email.ts as the orchestration layer.

const APP_URL = "https://brief-precall.vercel.app";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// All commercials are FR-based (per CLAUDE.md), so week boundaries are
// computed in Europe/Paris regardless of the server's own timezone (Vercel
// runs in UTC). Approximated as UTC-midnight-on-the-Paris-calendar-date
// rather than exact Paris-midnight — off by the UTC/Paris offset (1-2h at
// the boundary), which is fine for a weekly digest, not a precision report.
function parisDateParts(d: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday: weekdayMap[get("weekday")] ?? 0 };
}

function mostRecentParisMonday(now: Date): Date {
  const { year, month, day, weekday } = parisDateParts(now);
  const todayUTCMidnight = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return new Date(todayUTCMidnight.getTime() - daysSinceMonday * ONE_DAY_MS);
}

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

  try {
    if (user.role === "manager") {
      const team = await getManagerDigestData(
        user.id,
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
        prevRangeStart.toISOString(),
        prevRangeEnd.toISOString()
      );
      await sendManagerWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        periodLabel,
        team,
        teamUrl: `${APP_URL}/team`,
      });
    } else {
      const stats = await getCommercialDigestData(
        user.id,
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
        prevRangeStart.toISOString(),
        prevRangeEnd.toISOString()
      );
      await sendCommercialWeeklyDigestEmail({
        to: user.email,
        userName: user.name,
        periodLabel,
        stats,
        dashboardUrl: `${APP_URL}/dashboard`,
      });
    }
    return { userId: user.id, role: user.role, outcome: "sent" };
  } catch (err) {
    return { userId: user.id, role: user.role, outcome: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
