"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, Users, UserPlus, Settings2, Trophy, Gauge } from "lucide-react";
import type { TeamOverviewItem, TeamAverageScores } from "@/lib/db";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import ManageTeamModal from "./ManageTeamModal";
import InviteCommercialModal from "./InviteCommercialModal";

const ACCENTS = ["indigo", "violet", "emerald", "amber", "rose"] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-300 text-xs">—</span>;
  const cls =
    score >= 4
      ? "bg-green-100 text-green-700"
      : score >= 2.5
      ? "bg-orange-100 text-orange-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {score.toFixed(1)}/5
    </span>
  );
}

type SortKey = "name" | "briefs" | "calls" | "emails" | "score" | "activity";
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentSort === sortKey;
  return (
    <th className={`px-4 py-3 text-${align === "right" ? "right" : "left"}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
          active ? "text-[color:var(--violet)]" : "text-slate-400 hover:text-slate-600"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        {active &&
          (currentDirection === "asc" ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ))}
      </button>
    </th>
  );
}

export default function TeamClient({
  overview,
  averages,
  hasOrganization,
}: {
  overview: TeamOverviewItem[];
  averages: TeamAverageScores;
  hasOrganization: boolean;
}) {
  const router = useRouter();
  const [showManageModal, setShowManageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleCloseManageModal() {
    setShowManageModal(false);
    router.refresh();
  }

  function handleCloseInviteModal() {
    setShowInviteModal(false);
    router.refresh();
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  const filteredOverview = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? overview.filter(
          (c) => (c.name ?? "").toLowerCase().includes(trimmed) || c.email.toLowerCase().includes(trimmed)
        )
      : overview;

    const sorted = [...matching].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.name ?? a.email).localeCompare(b.name ?? b.email);
          break;
        case "briefs":
          cmp = a.briefs_count - b.briefs_count;
          break;
        case "calls":
          cmp = a.calls_count - b.calls_count;
          break;
        case "emails":
          cmp = a.emails_sent_count - b.emails_sent_count;
          break;
        case "score":
          cmp = (a.avg_score ?? -1) - (b.avg_score ?? -1);
          break;
        case "activity":
          cmp = (a.last_activity_at ?? "").localeCompare(b.last_activity_at ?? "");
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [overview, query, sortKey, sortDirection]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Hero header */}
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-sm)] bg-white p-8 mb-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
          />
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--violet)] bg-[color:var(--lavender)] px-2.5 py-1 rounded-full mb-3">
                <Users className="w-3 h-3" />
                Pilotage d&apos;équipe
              </span>
              <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
              <p className="text-slate-500 text-sm mt-1">
                Suivi de la performance de {overview.length} {overview.length === 1 ? "commercial" : "commerciaux"}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowInviteModal(true)}
                disabled={!hasOrganization}
                title={
                  hasOrganization
                    ? undefined
                    : "Vous devez être rattaché à une organisation pour inviter un collaborateur."
                }
                className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                <UserPlus className="w-4 h-4" />
                Inviter un collaborateur
              </button>
              <button
                onClick={() => setShowManageModal(true)}
                className="inline-flex items-center gap-2 h-9 px-3.5 brand-gradient text-white rounded-lg text-sm font-medium shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow-md)] transition-all duration-200"
              >
                <Settings2 className="w-4 h-4" />
                Gérer mon équipe
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Team average scores — dimensions viennent du playbook actuel de
          l'organisation (voir getTeamAverageScores), pas d'un set fixe */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
        <StatTile
          index={0}
          accent="indigo"
          label="Score global"
          value={averages.global_score}
          decimals={1}
          suffix={averages.global_score !== null ? "/5" : undefined}
          icon={<Trophy className="w-3.5 h-3.5" />}
        />
        {averages.dimensions.map((dim, i) => (
          <StatTile
            key={dim.key}
            index={i + 1}
            accent={ACCENTS[(i + 1) % ACCENTS.length]}
            label={dim.label}
            value={dim.average}
            decimals={1}
            suffix={dim.average !== null ? "/5" : undefined}
            icon={<Gauge className="w-3.5 h-3.5" />}
          />
        ))}
      </div>
      <p className="text-slate-400 text-xs mb-6">
        {averages.calls_analyzed_count} appel{averages.calls_analyzed_count > 1 ? "s" : ""} analysé
        {averages.calls_analyzed_count > 1 ? "s" : ""} pris en compte
      </p>

      {/* Commercials table */}
      {overview.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
          <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-medium">Aucun commercial rattaché à votre équipe pour l&apos;instant</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4 w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un commercial…"
              className="pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
            />
          </div>

          {filteredOverview.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
              <p className="text-slate-500 text-sm">Aucun résultat pour « {query} ».</p>
            </div>
          ) : (
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[820px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <SortHeader label="Nom" sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Briefs" sortKey="briefs" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} align="right" />
                        <SortHeader label="Appels" sortKey="calls" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} align="right" />
                        <SortHeader label="Emails" sortKey="emails" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} align="right" />
                        <SortHeader label="Score moyen" sortKey="score" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                        <SortHeader label="Dernière activité" sortKey="activity" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverview.map((c) => (
                        <tr
                          key={c.user_id}
                          onClick={() => router.push(`/team/${c.user_id}`)}
                          className="border-b border-slate-100 last:border-b-0 hover:bg-[color:var(--lavender)]/50 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3.5 max-w-[220px]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br brand-gradient flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-white">
                                  {(c.name ?? c.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate group-hover:text-[color:var(--violet)] transition-colors">
                                  {c.name || "—"}
                                </p>
                                <p className="text-slate-400 text-xs truncate">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">{c.briefs_count}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">{c.calls_count}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-slate-700 whitespace-nowrap">{c.emails_sent_count}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <ScoreBadge score={c.avg_score} />
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">{formatDate(c.last_activity_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </FadeIn>
          )}
        </>
      )}

      {showManageModal && <ManageTeamModal onClose={handleCloseManageModal} />}
      {showInviteModal && <InviteCommercialModal onClose={handleCloseInviteModal} />}
    </div>
  );
}
