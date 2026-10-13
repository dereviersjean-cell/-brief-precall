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
  const barColor = score >= 4 ? "bg-[color:var(--success)]" : score >= 2.5 ? "bg-[color:var(--warning)]" : "bg-[color:var(--danger)]";
  const textColor = score >= 4 ? "text-emerald-700" : score >= 2.5 ? "text-amber-700" : "text-rose-700";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-[13.5px] font-medium text-slate-700">
          {label}
          {weight != null && weight !== 1 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              poids {weight}
            </span>
          )}
        </span>
        <span className={`text-[13.5px] font-semibold tabular-nums ${textColor}`}>{score}/5</span>
      </div>
      <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {description && <p className="text-[12px] leading-relaxed text-slate-500">{description}</p>}
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

function List({ items, icon, color }: { items: string[]; icon: string; color: string }) {
  if (!items.length) return <p className="text-[13px] italic text-slate-400">Aucun élément.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`mt-0.5 text-[13px] ${color}`}>{icon}</span>
          <span className="text-[13.5px] leading-relaxed text-slate-700">{item}</span>
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
  const globalColor = globalScore >= 4 ? "text-emerald-700" : globalScore >= 2.5 ? "text-amber-700" : "text-rose-700";

  const sentimentBg: Record<string, string> = {
    positif: "bg-[color:var(--success-soft)] text-emerald-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-[color:var(--danger-soft)] text-rose-700",
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
      <div className="rounded-2xl border border-border bg-white p-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1">Score global</p>
          <p className={`text-[36px] font-semibold leading-none tracking-tight tabular-nums ${globalColor}`}>
            {globalScore.toFixed(1)}
            <span className="text-[15px] font-medium text-slate-400">/5</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${sentimentBg[analysis.sentiment] ?? "bg-slate-100 text-slate-500"}`}>
          {analysis.sentiment}
        </span>
      </div>

      {/* Résumé */}
      {analysis.summary && (
        <div className="rounded-2xl bg-[color:var(--lavender)] p-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--violet)]">Résumé</p>
          <p className="text-[13.5px] leading-relaxed text-slate-700">{analysis.summary}</p>
        </div>
      )}

      {/* Scores par dimension */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-5">Scores par dimension</h2>
        <div className="space-y-5">
          {dimensionScores.map((dim) => (
            <ScoreBar key={dim.key} score={dim.score} label={dim.label} description={dim.description} weight={dim.weight} />
          ))}
        </div>
      </div>

      {/* Points forts + Axes d'amélioration */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-4">Points forts</h2>
          <List items={analysis.strong_points} icon="✓" color="text-emerald-600" />
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-4">Axes d&apos;amélioration</h2>
          <List items={analysis.weak_points} icon="△" color="text-amber-600" />
        </div>
      </div>

      {/* Prochaines étapes */}
      {analysis.next_steps.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-4">Prochaines étapes</h2>
          <List items={analysis.next_steps} icon="→" color="text-[color:var(--violet)]" />
        </div>
      )}
    </div>
  );
}

// ─── Prompt viewer ────────────────────────────────────────────────────────────

function PromptViewer({ prompt }: { prompt: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Prompt utilisé</h2>
        <a
          href="/admin/prompts"
          className="text-[12px] font-medium text-[color:var(--violet)] underline underline-offset-2"
        >
          Modifier ce prompt →
        </a>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={10}
        className="w-full resize-y rounded-xl border border-border bg-slate-50 px-3.5 py-3 font-mono text-[12px] leading-relaxed text-slate-500 focus:outline-none"
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
          eyebrow="Outils techniques"
          title="Test de l'analyse d'un call"
          subtitle={
            <>
              Contexte fixe : <span className="font-medium text-slate-700">Brief / Oliverlist</span> → Prospect test
            </>
          }
        />
      </FadeIn>

      <div className="space-y-6">
        {/* Form */}
        <form onSubmit={handleAnalyze} className="rounded-2xl border border-border bg-white p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5">
              Transcription *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={20}
              required
              placeholder={"[00:00] Commercial : Bonjour, je suis...\n[00:15] Prospect : ..."}
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-white text-[13px] text-slate-800 font-mono leading-relaxed focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)] resize-y"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={analyzing || !transcript.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-4 text-[13.5px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing && <Spinner />}
              {analyzing ? "Analyse en cours…" : "Analyser"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-[color:var(--danger-soft)] p-4 text-[13px] text-rose-700">
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
