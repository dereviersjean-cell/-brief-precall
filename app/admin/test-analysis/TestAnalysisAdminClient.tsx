"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import type { CallAnalysis } from "@/lib/call-analysis";
import { AdminNav } from "../AdminNav";

type PageState = "loading" | "login" | "ready";

type AnalysisResult = {
  analysis: CallAnalysis;
  prompt_used: string;
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Erreur inconnue.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Accès réservé</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe admin</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading && <Spinner />}
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, label, description }: { score: number; label: string; description?: string }) {
  const pct = Math.round((score / 5) * 100);
  const barColor = score >= 4 ? "bg-green-500" : score >= 2.5 ? "bg-orange-400" : "bg-red-400";
  const textColor = score >= 4 ? "text-green-700" : score >= 2.5 ? "text-orange-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
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

function AnalysisDisplay({ analysis }: { analysis: CallAnalysis }) {
  const globalScore = analysis.scores.global_score;
  const globalColor = globalScore >= 4 ? "text-green-600" : globalScore >= 2.5 ? "text-orange-500" : "text-red-500";

  const sentimentBg: Record<string, string> = {
    positif: "bg-green-100 text-green-700",
    neutre: "bg-slate-100 text-slate-500",
    négatif: "bg-red-100 text-red-600",
  };

  // Dynamic — scores is keyed by whatever dimensions the playbook injected
  // into the prompt (global_score aside), not a fixed set of 4.
  const dimensionEntries = Object.entries(analysis.scores).filter(
    (entry): entry is [string, { score: number; description: string }] =>
      entry[0] !== "global_score" && typeof entry[1] === "object" && entry[1] !== null
  );

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
          {dimensionEntries.map(([key, dim]) => (
            <ScoreBar key={key} score={dim.score} label={key} description={dim.description} />
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
  const [pageState, setPageState] = useState<PageState>("loading");
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      setPageState(res.ok ? "ready" : "login");
    } catch {
      setPageState("login");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (pageState === "login") {
    return <LoginForm onSuccess={checkAuth} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test analyse de call</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Contexte fixe : <span className="font-medium text-slate-700">Brief / Oliverlist</span> → Prospect test
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAnalyze} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
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
            <AnalysisDisplay analysis={result.analysis} />
            <PromptViewer prompt={result.prompt_used} />
          </>
        )}
      </div>
      </div>
    </div>
  );
}
