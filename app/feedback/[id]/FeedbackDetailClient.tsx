"use client";

import Link from "next/link";
import { useState } from "react";
import type { CallWithAnalysis, AnalysisScores } from "@/lib/db";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ScoreBar({ score, label, description }: { score: number; label: string; description?: string }) {
  const pct = Math.round((score / 5) * 100);
  const color =
    score >= 4 ? "bg-green-500" : score >= 2.5 ? "bg-orange-400" : "bg-red-400";
  const textColor =
    score >= 4 ? "text-green-700" : score >= 2.5 ? "text-orange-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/5</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (items.length === 0) return <p className="text-slate-400 text-sm italic">Aucun élément.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`text-sm mt-0.5 ${color}`}>{icon}</span>
          <span className="text-sm text-slate-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FeedbackDetailClient({ call }: { call: CallWithAnalysis }) {
  const [copied, setCopied] = useState(false);
  const a = call.analysis;
  const scores = a?.scores as AnalysisScores | null;
  const globalScore = scores?.global_score ?? null;

  const globalColor =
    globalScore === null
      ? "text-slate-400"
      : globalScore >= 4
      ? "text-green-600"
      : globalScore >= 2.5
      ? "text-orange-500"
      : "text-red-500";

  const sentimentBg: Record<string, string> = {
    positif: "bg-green-100 text-green-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Back */}
        <Link
          href="/feedback"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Retour aux feedbacks
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {call.company_name || call.contact_email || "Call sans titre"}
              </h1>
              {call.company_name && call.contact_email && (
                <p className="text-slate-400 text-sm mt-0.5">{call.contact_email}</p>
              )}
              <p className="text-slate-400 text-sm mt-1">{formatDate(call.created_at)}</p>
            </div>
            <div className="text-right shrink-0">
              {globalScore !== null && (
                <p className={`text-3xl font-bold ${globalColor}`}>
                  {globalScore.toFixed(1)}<span className="text-base font-medium text-slate-300">/5</span>
                </p>
              )}
              {a?.sentiment && (
                <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${sentimentBg[a.sentiment] ?? "bg-slate-100 text-slate-500"}`}>
                  {a.sentiment}
                </span>
              )}
            </div>
          </div>
        </div>

        {!a ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            Analyse non disponible pour cet appel.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Coaching summary */}
            {a.summary && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Synthèse coaching</p>
                <p className="text-slate-700 text-sm leading-relaxed">{a.summary}</p>
              </div>
            )}

            {/* Scores par dimension */}
            {scores && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                  Scores par dimension
                </h2>
                <div className="space-y-5">
                  <ScoreBar
                    score={scores.opening_framing.score}
                    label="Ouverture & cadrage"
                    description={scores.opening_framing.description}
                  />
                  <ScoreBar
                    score={scores.pain_point.score}
                    label="Découverte des besoins"
                    description={scores.pain_point.description}
                  />
                  <ScoreBar
                    score={scores.pitch_demo.score}
                    label="Argumentation & démo"
                    description={scores.pitch_demo.description}
                  />
                  <ScoreBar
                    score={scores.next_step.score}
                    label="Conclusion & suite"
                    description={scores.next_step.description}
                  />
                </div>
              </div>
            )}

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Points forts</h2>
                <List items={a.strengths ?? []} icon="✓" color="text-green-500" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Axes d&apos;amélioration</h2>
                <List items={a.weaknesses ?? []} icon="△" color="text-orange-400" />
              </div>
            </div>

            {/* Objections */}
            {(a.objections ?? []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Objections rencontrées</h2>
                <List items={a.objections ?? []} icon="–" color="text-slate-400" />
              </div>
            )}

            {/* Next steps */}
            {(a.next_steps ?? []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Prochaines étapes</h2>
                <List items={a.next_steps ?? []} icon="→" color="text-indigo-400" />
              </div>
            )}

            {/* Email de suivi */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email de suivi suggéré</h2>
                {call.follow_up_email && (
                  <button
                    onClick={() => {
                      const text = `Objet : ${call.follow_up_email!.subject}\n\n${call.follow_up_email!.body}`;
                      navigator.clipboard.writeText(text).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
                  >
                    {copied ? "Copié !" : "Copier"}
                  </button>
                )}
              </div>
              {call.follow_up_email ? (
                <>
                  <p className="font-semibold text-slate-800 text-sm mb-3">{call.follow_up_email.subject}</p>
                  <p className="text-sm text-slate-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed">
                    {call.follow_up_email.body}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm italic">Email de suivi en cours de génération…</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
