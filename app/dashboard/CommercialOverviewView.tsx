import Link from "next/link";
import { Phone, FileText, TrendingUp, Calendar, Download, Sparkles, History } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import StatTile from "./StatTile";
import ScoreTrendChart from "./ScoreTrendChart";
import ConnectionsStatus from "./ConnectionsStatus";
import RecentCallsList, { type RecentCallRow } from "./RecentCallsList";
import FadeIn from "./FadeIn";
import { formatContactDisplayName } from "@/lib/format";
import type { CommercialDigestData, ContactOverviewItem } from "@/lib/db";
import type { ScoreTrendWeek } from "@/lib/dashboard";

// Rendu pur de la vue d'ensemble, séparé de sa lecture en base
// (CommercialOverview.tsx) pour être réutilisable avec des données d'exemple
// (/demo/dashboard). La séparation lecture/affichage sert aussi les tests :
// cette vue se rend sans base ni session.

const TREND_WEEKS = 6;

export default function CommercialOverviewView({
  userId,
  userName,
  viewerRole,
  now,
  weekStats,
  trendWeeks,
  last5Calls,
  topContacts,
  linksEnabled = true,
}: {
  // ConnectionsStatus lit la base : en démo on ne le rend pas du tout, d'où
  // un userId optionnel.
  userId: string | null;
  userName: string | null;
  viewerRole: "self" | "manager";
  now: Date;
  weekStats: CommercialDigestData;
  trendWeeks: ScoreTrendWeek[];
  last5Calls: RecentCallRow[];
  topContacts: ContactOverviewItem[];
  // false en démonstration : ni les calls ni les contacts n'existent en base.
  linksEnabled?: boolean;
}) {
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
                  <Button variant="secondary" className="hidden sm:inline-flex" icon={<Calendar className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                    Cette semaine
                  </Button>
                  <Button variant="secondary" className="hidden sm:inline-flex" icon={<Download className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
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

      {/* Ancre de la visite guidée : la bulle parle des chiffres de la
          semaine, c'est donc cette rangée qu'il faut mettre en évidence, pas
          la page entière. */}
      <div data-tour="overview-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
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
              <RecentCallsList calls={last5Calls} linksEnabled={linksEnabled} />
            </Card>
          </FadeIn>
        </div>

        <div className="space-y-5">
          {viewerRole === "self" && userId && (
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
        </div>
      </div>
    </div>
  );
}
