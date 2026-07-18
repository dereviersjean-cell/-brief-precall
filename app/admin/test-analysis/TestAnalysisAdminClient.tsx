"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { PhoneCall } from "lucide-react";
import type { CallAnalysis } from "@/lib/call-analysis";
import type { PlaybookSnapshot } from "@/lib/db";
import { getEffectiveScoresForDisplay } from "@/lib/playbook-scores";
import { Spinner, AdminPageShell, AdminPageHeader } from "../AdminShell";
import FadeIn from "@/app/dashboard/FadeIn";

type AnalysisResult = {
  analysis: CallAnalysis;
  prompt_used: string;
  playbook_snapshot: PlaybookSnapshot;
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  score,
  label,
  description,
  weight,
}: {
  score: number;
  label: string;
  description?: string;
  weight?: number;
}) {
  const pct = Math.round((score / 5) * 100);
  const barColor = score >= 4 ? "bg-green-500" : score >= 2.5 ? "bg-orange-400" : "bg-red-400";
  const textColor = score >= 4 ? "text-green-700" : score >= 2.5 ? "text-orange-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
          {label}
          {weight != null && weight !== 1 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
              poids {weight}
            </span>
          )}
        </span>
        <span className={`text-sm font-bold ${textColor}`}>{score}/5</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (!items.length) return <p className="text-slate-400 text-sm italic">Aucun élément.</p>;
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

// ─── Analysis display ─────────────────────────────────────────────────────────

function AnalysisDisplay({
  analysis,
  playbookSnapshot,
}: {
  analysis: CallAnalysis;
  playbookSnapshot: PlaybookSnapshot;
}) {
  const globalScore = analysis.scores.global_score;
  const globalColor = globalScore >= 4 ? "text-green-600" : globalScore >= 2.5 ? "text-orange-500" : "text-red-500";

  const sentimentBg: Record<string, string> = {
    positif: "bg-green-100 text-green-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-100 text-red-600",
  };

  // Same helper the rest of the app uses for score display (sous-étape D) —
  // resolves human labels/weight/order from the snapshot instead of showing
  // raw dimension keys.
  const dimensionScores = getEffectiveScoresForDisplay({
    scores: analysis.scores,
    playbook_snapshot: playbookSnapshot,
  });

  return (
    <div className="space-y-5">
      {/* Header : score global + sentiment */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Score global</p>
          <p className={`text-4xl font-bold ${globalColor}`}>
            {globalScore.toFixed(1)}
            <span className="text-base font-medium text-slate-300">/5</span>
          </p>
        </div>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${sentimentBg[analysis.sentiment] ?? "bg-slate-100 text-slate-500"}`}>
          {analysis.sentiment}
        </span>
      </div>

      {/* Résumé */}
      {analysis.summary && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Résumé</p>
          <p className="text-slate-700 text-sm leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Scores par dimension */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Scores par dimension</h2>
        <div className="space-y-5">
          {dimensionScores.map((dim) => (
            <ScoreBar key={dim.key} score={dim.score} label={dim.label} description={dim.description} weight={dim.weight} />
          ))}
        </div>
      </div>

      {/* Points forts + Axes d'amélioration */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Points forts</h2>
          <List items={analysis.strong_points} icon="✓" color="text-green-500" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Axes d&apos;amélioration</h2>
          <List items={analysis.weak_points} icon="△" color="text-orange-400" />
        </div>
      </div>

      {/* Prochaines étapes */}
      {analysis.next_steps.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Prochaines étapes</h2>
          <List items={analysis.next_steps} icon="→" color="text-indigo-400" />
        </div>
      )}
    </div>
  );
}

// ─── Prompt viewer ────────────────────────────────────────────────────────────

function PromptViewer({ prompt }: { prompt: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prompt utilisé</h2>
        <a
          href="/admin/prompts"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
        >
          Modifier ce prompt →
        </a>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={10}
        className="w-full px-3.5 py-3 border border-slate-100 rounded-lg text-xs text-slate-500 font-mono leading-relaxed bg-slate-50 resize-y focus:outline-none"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestAnalysisAdminClient() {
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/test-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur inconnue.");
      } else {
        setResult(data as AnalysisResult);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <AdminPageShell maxWidth="max-w-3xl">
      <FadeIn>
        <AdminPageHeader
          icon={PhoneCall}
          eyebrow="Outil de test"
          title="Test analyse de call"
          subtitle={
            <>
              Contexte fixe : <span className="font-medium text-slate-700">Brief / Oliverlist</span> → Prospect test
            </>
          }
        />
      </FadeIn>

      <div className="space-y-6">
        {/* Form */}
        <form onSubmit={handleAnalyze} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Transcription *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={20}
              required
              placeholder={"[00:00] Commercial : Bonjour, je suis...\n[00:15] Prospect : ..."}
              className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={analyzing || !transcript.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {analyzing && <Spinner />}
              {analyzing ? "Analyse en cours…" : "Analyser"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <AnalysisDisplay analysis={result.analysis} playbookSnapshot={result.playbook_snapshot} />
            <PromptViewer prompt={result.prompt_used} />
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
