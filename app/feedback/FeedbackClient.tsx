"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronUp, ChevronDown, Mic, Users, Clock } from "lucide-react";
import type { CallWithAnalysis } from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import { PageHeader } from "@/app/components/ui/PageHeader";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScoreBadge({ score }: { score: number }) {
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

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-slate-300 text-xs">—</span>;
  const map: Record<string, string> = {
    positif: "bg-green-50 text-green-600",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-50 text-red-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[sentiment] ?? "bg-slate-100 text-slate-500"}`}>
      {sentiment}
    </span>
  );
}

function FollowUpBadge({ call }: { call: CallWithAnalysis }) {
  if (call.follow_up_sent_at) {
    return (
      <span
        title={new Date(call.follow_up_sent_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
        className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
        </svg>
        Envoyé
      </span>
    );
  }
  if (call.follow_up_email) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Brouillon</span>;
  }
  return <span className="text-slate-300 text-xs">—</span>;
}

type SortKey = "name" | "date" | "duration" | "participants" | "score";
type SortDirection = "asc" | "desc";

// Enriched with the pieces the table needs but that aren't on
// CallWithAnalysis itself (displayName for search/sort, numeric score for
// sort) — computed once per render rather than repeatedly in the sort
// comparator or JSX.
type Row = {
  call: CallWithAnalysis;
  displayName: string;
  score: number | null;
};

function SortHeader({
  label,
  icon,
  sortKey,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string;
  icon?: ReactNode;
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
        {icon}
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

export default function FeedbackClient({ calls }: { calls: CallWithAnalysis[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows: Row[] = useMemo(
    () =>
      calls.map((call) => ({
        call,
        displayName: formatContactDisplayName(call.company_name, call.contact_email),
        score: call.analysis?.scores?.global_score ?? null,
      })),
    [calls]
  );

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matching = trimmed
      ? rows.filter(
          (r) =>
            r.displayName.toLowerCase().includes(trimmed) ||
            (r.call.contact_email ?? "").toLowerCase().includes(trimmed)
        )
      : rows;

    const sorted = [...matching].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.displayName.localeCompare(b.displayName);
          break;
        case "date":
          cmp = (a.call.started_at ?? a.call.created_at).localeCompare(b.call.started_at ?? b.call.created_at);
          break;
        case "duration":
          cmp = (a.call.duration_seconds ?? -1) - (b.call.duration_seconds ?? -1);
          break;
        case "participants":
          cmp = (a.call.participant_count ?? -1) - (b.call.participant_count ?? -1);
          break;
        case "score":
          cmp = (a.score ?? -1) - (b.score ?? -1);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, query, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <PageHeader
            eyebrow="Analyse IA"
            title={
              <>
                Feedback <span className="italic-serif text-[color:var(--violet)]">post-call</span>
              </>
            }
            subtitle="Analyse de vos appels commerciaux par l'IA."
          />
          {calls.length > 0 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un contact, une entreprise…"
                className="pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white w-72 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
            </div>
          )}
        </div>

        {calls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
            <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Aucun appel analysé pour l&apos;instant</p>
            <p className="text-slate-400 text-sm mt-1">
              Vos analyses apparaîtront ici après chaque appel enregistré via Recall.AI.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
            <p className="text-slate-500 text-sm">Aucun résultat pour « {query} ».</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
                    <SortHeader label="Contact / Entreprise" sortKey="name" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortHeader label="Date" sortKey="date" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <SortHeader
                      label="Durée"
                      icon={<Clock className="w-3 h-3" />}
                      sortKey="duration"
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Participants"
                      icon={<Users className="w-3 h-3" />}
                      sortKey="participants"
                      currentSort={sortKey}
                      currentDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader label="Score" sortKey="score" currentSort={sortKey} currentDirection={sortDirection} onSort={handleSort} />
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sentiment</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Suivi</span>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Mic className="w-3 h-3" />
                        Enregistrement
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ call, displayName, score }) => (
                    <tr
                      key={call.id}
                      onClick={() => router.push(`/feedback/${call.id}`)}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-[color:var(--lavender)]/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 max-w-[260px]">
                        <Link href={`/feedback/${call.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                          <p className="font-medium text-slate-900 text-sm truncate group-hover:text-[color:var(--violet)] transition-colors">
                            {displayName}
                          </p>
                          {call.contact_email && call.contact_email !== displayName && (
                            <p className="text-slate-400 text-xs truncate mt-0.5">{call.contact_email}</p>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-sm text-slate-700">{formatDate(call.started_at ?? call.created_at)}</p>
                        <p className="text-xs text-slate-400">{formatTime(call.started_at ?? call.created_at)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                        {call.duration_seconds !== null ? formatDuration(call.duration_seconds) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                        {call.participant_count ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {score !== null ? <ScoreBadge score={score} /> : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <SentimentBadge sentiment={call.analysis?.sentiment ?? null} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <FollowUpBadge call={call} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {call.recall_bot_id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--violet)]">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Disponible
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
