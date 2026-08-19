import {
  getCommercialDigestData,
  getRecentCallScores,
  getCallsWithAnalysis,
  getContactsOverview,
} from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { formatContactDisplayName } from "@/lib/format";
import type { RecentCallRow } from "./RecentCallsList";
import CommercialOverviewView from "./CommercialOverviewView";

const TREND_WEEKS = 6;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default async function CommercialOverview({
  userId,
  userName,
  viewerRole = "self",
}: {
  userId: string;
  userName: string | null;
  // "manager" : un manager consulte la performance d'un commercial de son
  // équipe (via le sélecteur de /dashboard) — lecture seule, on masque les
  // actions qui n'agiraient de toute façon que sur le compte du manager
  // (Nouveau brief, connexions CRM/Slack du commercial viewé).
  viewerRole?: "self" | "manager";
}) {
  const now = new Date();
  // "This week so far" — same range shape as the Friday-evening digest,
  // reused here rather than recomputed (module Distribution Flexible's week
  // convention: Monday 00:00 Europe/Paris → now).
  const { rangeStart, rangeEnd, prevRangeStart, prevRangeEnd } = fridayEveningDigestRange(now);
  const trendSince = new Date(mostRecentParisMonday(now).getTime() - (TREND_WEEKS - 1) * 7 * ONE_DAY_MS);

  const [weekStats, rawScores, recentCalls, contacts] = await Promise.all([
    getCommercialDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentCallScores(userId, trendSince.toISOString()),
    getCallsWithAnalysis(userId),
    getContactsOverview(userId),
  ]);

  const trendWeeks = bucketScoresByWeek(rawScores, TREND_WEEKS, now);

  const last5Calls: RecentCallRow[] = recentCalls.slice(0, 5).map((call) => ({
    id: call.id,
    name: formatContactDisplayName(call.company_name, call.contact_email),
    dateLabel: new Date(call.started_at ?? call.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    score: call.analysis?.scores?.global_score ?? null,
  }));

  // Historique important : les contacts les plus récemment actifs — un
  // aperçu, pas la liste complète (→ /contacts pour tout voir).
  const topContacts = contacts.slice(0, 4);

  // L'affichage vit dans CommercialOverviewView : séparé de la lecture pour
  // être réutilisable avec des données d'exemple (/demo/dashboard).
  return (
    <CommercialOverviewView
      userId={userId}
      userName={userName}
      viewerRole={viewerRole}
      now={now}
      weekStats={weekStats}
      trendWeeks={trendWeeks}
      last5Calls={last5Calls}
      topContacts={topContacts}
    />
  );
}

