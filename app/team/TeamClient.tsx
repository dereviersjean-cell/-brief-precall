"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamOverviewItem, TeamAverageScores } from "@/lib/db";
import ManageTeamModal from "./ManageTeamModal";

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

const DIMENSION_KEYS = ["global_score", "opening_framing", "pain_point", "pitch_demo", "next_step"] as const;

const DIMENSION_LABELS: Record<(typeof DIMENSION_KEYS)[number], string> = {
  global_score: "Score global",
  opening_framing: "Ouverture & cadrage",
  pain_point: "Découverte besoin",
  pitch_demo: "Pitch & démo",
  next_step: "Prochaine étape",
};

export default function TeamClient({
  overview,
  averages,
}: {
  overview: TeamOverviewItem[];
  averages: TeamAverageScores;
}) {
  const router = useRouter();
  const [showManageModal, setShowManageModal] = useState(false);

  function handleCloseManageModal() {
    setShowManageModal(false);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Suivi de la performance de vos commerciaux.
            </p>
          </div>
          <button
            onClick={() => setShowManageModal(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Gérer mon équipe
          </button>
        </div>

        {/* Team average scores */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
          {DIMENSION_KEYS.map((key) => {
            const value = averages[key];
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {DIMENSION_LABELS[key]}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {value !== null ? `${value.toFixed(1)}/5` : "—"}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-slate-400 text-xs mb-8">
          {averages.calls_analyzed_count} appel{averages.calls_analyzed_count > 1 ? "s" : ""} analysé
          {averages.calls_analyzed_count > 1 ? "s" : ""} pris en compte
        </p>

        {/* Commercials table */}
        {overview.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Aucun commercial rattaché à votre équipe pour l&apos;instant</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Nom</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Email</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Briefs</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Appels</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Emails</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score moyen</th>
                    <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.map((c) => (
                    <tr
                      key={c.user_id}
                      onClick={() => router.push(`/team/${c.user_id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 pr-4 text-slate-800 font-medium max-w-[160px] truncate">{c.name || "—"}</td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[200px] truncate">{c.email}</td>
                      <td className="py-3 pr-4 text-slate-700 text-right font-mono">{c.briefs_count}</td>
                      <td className="py-3 pr-4 text-slate-700 text-right font-mono">{c.calls_count}</td>
                      <td className="py-3 pr-4 text-slate-700 text-right font-mono">{c.emails_sent_count}</td>
                      <td className="py-3 pr-4">
                        <ScoreBadge score={c.avg_score} />
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(c.last_activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showManageModal && <ManageTeamModal onClose={handleCloseManageModal} />}
    </div>
  );
}
