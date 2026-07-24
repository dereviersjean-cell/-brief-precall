import Link from "next/link";
import { Phone, FileText, MessagesSquare, TrendingUp, Calendar, Download, Sparkles, History, Trophy, XCircle } from "lucide-react";
import {
  getCommercialDigestData,
  getRecentCallScores,
  getCallsWithAnalysis,
  getUserOrganizationId,
  getObjectionStatsForOrganization,
  getContactsOverview,
} from "@/lib/db";
import { fridayEveningDigestRange } from "@/lib/digest";
import { mostRecentParisMonday, bucketScoresByWeek } from "@/lib/paris-week";
import { formatContactDisplayName } from "@/lib/format";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import ConnectionsStatus from "./ConnectionsStatus";
import RecentCallsList, { type RecentCallRow } from "./RecentCallsList";
import FadeIn from "./FadeIn";

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

  const organizationId = await getUserOrganizationId(userId);
  const [weekStats, rawScores, recentCalls, contacts, objectionStats] = await Promise.all([
    getCommercialDigestData(userId, rangeStart.toISOString(), rangeEnd.toISOString(), prevRangeStart.toISOString(), prevRangeEnd.toISOString()),
    getRecentCallScores(userId, trendSince.toISOString()),
    getCallsWithAnalysis(userId),
    getContactsOverview(userId),
    organizationId ? getObjectionStatsForOrganization(organizationId) : Promise.resolve([]),
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

  // Objections importantes : les plus fréquentes de l'équipe, avec leur
  // taux de succès quand l'issue du deal est connue. déjà triées par
  // occurrences desc côté getObjectionStatsForOrganization.
  const topObjections = objectionStats.slice(0, 4);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          {viewerRole === "manager" ? (
            <PageHeader
              eyebrow="Performance individuelle"
              title={userName ?? "Commercial"}
              subtitle="Vue en lecture seule — même contenu que son propre tableau de bord."
            />
          ) : (
            <PageHeader
              eyebrow="Vue d'ensemble"
              title={
                <>
                  Bonjour{userName ? ` ${userName.split(" ")[0]}` : ""}{" "}
                  <span className="italic-serif text-[color:var(--violet)]">👋</span>
                </>
              }
              subtitle={`${now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} — voici votre semaine.`}
              actions={
                <>
                  <Button variant="secondary" icon={<Calendar className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                    Cette semaine
                  </Button>
                  <Button variant="secondary" icon={<Download className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                    Exporter
                  </Button>
                  <Link
                    href="/brief"
                    className="brand-gradient inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium text-white shadow-[var(--shadow-glow)] hover:brightness-110 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Nouveau brief
                  </Link>
                </>
              }
            />
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatTile index={0} accent="indigo" label="Calls cette semaine" value={weekStats.calls_count} icon={<Phone className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Briefs générés" value={weekStats.briefs_count} icon={<FileText className="w-3.5 h-3.5" />} />
        <StatTile
          index={2}
          accent="emerald"
          label="Score moyen"
          value={weekStats.avg_score}
          decimals={1}
          suffix={weekStats.avg_score !== null ? "/5" : undefined}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          trend={weekStats.avg_score !== null ? { current: weekStats.avg_score, previous: weekStats.prev_avg_score } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <ScoreTrendChart weeks={trendWeeks} title={`Score moyen — ${TREND_WEEKS} dernières semaines`} />

          <FadeIn delay={0.1}>
            <Card padded={false} className="p-5">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-4">Calls récents</h2>
              <RecentCallsList calls={last5Calls} />
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-5">
          {viewerRole === "self" && (
            <FadeIn delay={0.15}>
              <ConnectionsStatus userId={userId} />
            </FadeIn>
          )}

          <FadeIn delay={0.2}>
            <Card padded={false} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Historique important</h2>
                <History className="w-4 h-4 text-slate-300" />
              </div>
              {topContacts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucun contact pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-3">
                  {topContacts.map((c) => (
                    <li key={c.contact_email} className="flex items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">{formatContactDisplayName(c.company_name, c.contact_email)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c.video_call_count} call{c.video_call_count > 1 ? "s" : ""}
                          {c.emails_sent_count > c.replies_count && " · en attente de réponse"}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                        {new Date(c.last_contact_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/contacts" className="inline-block mt-4 text-xs font-medium text-[color:var(--violet)] hover:underline">
                Tout l&apos;historique →
              </Link>
            </Card>
          </FadeIn>

          <FadeIn delay={0.25}>
            <Card padded={false} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Objections importantes</h2>
                <MessagesSquare className="w-4 h-4 text-slate-300" />
              </div>
              {topObjections.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucune objection indexée pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-3">
                  {topObjections.map((o) => {
                    const known = o.wonCount + o.lostCount;
                    return (
                      <li key={o.objection} className="min-w-0">
                        <p className="text-sm text-slate-700 truncate">« {o.objection} »</p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{o.occurrences}×</span>
                          {known > 0 && (
                            <span className="inline-flex items-center gap-2.5">
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <Trophy className="w-3 h-3" /> {o.wonCount}
                              </span>
                              <span className="inline-flex items-center gap-1 text-rose-500">
                                <XCircle className="w-3 h-3" /> {o.lostCount}
                              </span>
                            </span>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Link href="/settings/objections" className="inline-block mt-4 text-xs font-medium text-[color:var(--violet)] hover:underline">
                Toute la bibliothèque →
              </Link>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
