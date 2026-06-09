"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AdminConfig } from "@/lib/admin-config";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface BriefResult {
  overview: string;
  accroche: string;
  pain_points: Array<{ title: string; detail: string }>;
  arguments: Array<{ title: string; detail: string }>;
  vocabulaire: string[];
}

const MODELS = [
  {
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    description: "Rapide · ~$1 / 1M tokens",
    badge: "Rapide",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Meilleur · ~$3 / 1M tokens",
    badge: "Recommandé",
    badgeColor: "bg-indigo-100 text-indigo-700",
  },
];

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">{children}</div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
      {children}
    </h2>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AdminClient() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const [testCompany, setTestCompany] = useState("");
  const [testResult, setTestResult] = useState<BriefResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((data) => setConfig(data as AdminConfig))
      .catch(() => setLoadError(true));
  }, []);

  const update = (patch: Partial<AdminConfig>) =>
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));

  const saveConfig = async () => {
    if (!config) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const testBrief = async () => {
    if (!testCompany.trim() || !config) return;
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch("/api/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: testCompany.trim(), config }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestError((data as { error?: string }).error ?? "Erreur lors du test.");
      } else {
        setTestResult(data as BriefResult);
      }
    } catch {
      setTestError("Impossible de contacter le serveur.");
    } finally {
      setTestLoading(false);
    }
  };

  const saveBtnLabel =
    saveStatus === "saving" ? "Sauvegarde..." : saveStatus === "saved" ? "✓ Sauvegardé" : saveStatus === "error" ? "Erreur" : "Sauvegarder";
  const saveBtnClass =
    saveStatus === "saved"
      ? "bg-emerald-600 text-white"
      : saveStatus === "error"
      ? "bg-red-600 text-white"
      : "bg-slate-900 text-white hover:bg-slate-800";

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">Impossible de charger la configuration.</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Administration</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">Brief IA</span>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.reload();
            }}
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── 1. Prompt système ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Prompt système</SectionTitle>
            <button
              onClick={saveConfig}
              disabled={saveStatus === "saving"}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${saveBtnClass}`}
            >
              {saveBtnLabel}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={config.systemPrompt}
              onChange={(e) => update({ systemPrompt: e.target.value })}
              rows={8}
              spellCheck={false}
              className="w-full bg-slate-900 text-slate-100 font-mono text-sm px-4 py-3 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
            <span className="absolute bottom-3 right-3 text-xs text-slate-500 pointer-events-none">
              {config.systemPrompt.length} car.
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Instruction système envoyée à Claude avant chaque génération.
          </p>
        </Card>

        {/* ── 2. Variables du brief ── */}
        <Card>
          <SectionTitle>Variables du brief</SectionTitle>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">

            {/* Pain points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Pain points</label>
                <span className="text-indigo-600 font-bold text-sm">{config.painPointsCount}</span>
              </div>
              <input
                type="range" min={1} max={5} step={1}
                value={config.painPointsCount}
                onChange={(e) => update({ painPointsCount: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span><span>5</span>
              </div>
            </div>

            {/* Arguments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Arguments commerciaux</label>
                <span className="text-indigo-600 font-bold text-sm">{config.argumentsCount}</span>
              </div>
              <input
                type="range" min={1} max={5} step={1}
                value={config.argumentsCount}
                onChange={(e) => update({ argumentsCount: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span><span>5</span>
              </div>
            </div>

            {/* Mots-clés */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Mots-clés vocabulaire</label>
                <span className="text-indigo-600 font-bold text-sm">{config.keywordsCount}</span>
              </div>
              <input
                type="range" min={3} max={10} step={1}
                value={config.keywordsCount}
                onChange={(e) => update({ keywordsCount: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>3</span><span>10</span>
              </div>
            </div>

            {/* Spacer */}
            <div />

            {/* Overview length */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Longueur de l&apos;overview</label>
              <div className="flex gap-2">
                {(["court", "moyen", "long"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update({ overviewLength: opt })}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors capitalize ${
                      config.overviewLength === opt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ton du brief</label>
              <div className="flex gap-2">
                {(["formel", "professionnel", "direct"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => update({ tone: opt })}
                    className={`flex-1 py-2 text-sm rounded-lg border transition-colors capitalize ${
                      config.tone === opt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Card>

        {/* ── 3. Modèle Claude ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Modèle Claude</SectionTitle>
            <button
              onClick={saveConfig}
              disabled={saveStatus === "saving"}
              className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${saveBtnClass}`}
            >
              {saveBtnLabel}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => update({ model: m.id })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  config.model === m.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{m.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.badgeColor}`}>
                    {m.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">{m.description}</p>
                <p className="text-xs text-slate-400 font-mono">{m.id}</p>
              </button>
            ))}
          </div>
        </Card>

        {/* ── 4. Zone de test ── */}
        <Card>
          <SectionTitle>Zone de test</SectionTitle>
          <div className="flex gap-3 mb-5">
            <input
              type="text"
              value={testCompany}
              onChange={(e) => setTestCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && testBrief()}
              placeholder="Nom de l'entreprise..."
              className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={testBrief}
              disabled={testLoading || !testCompany.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testLoading ? <><Spinner />Génération...</> : "Tester →"}
            </button>
          </div>

          {testError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
              {testError}
            </div>
          )}

          {testLoading && (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <Spinner />
              Génération avec {config.model}...
            </div>
          )}

          {testResult && !testLoading && (
            <div className="space-y-5 pt-2 border-t border-slate-100">
              {/* Accroche */}
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Accroche</p>
                <p className="text-slate-800 text-sm font-medium leading-relaxed">&ldquo;{testResult.accroche}&rdquo;</p>
              </div>

              {/* Overview */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Overview</p>
                <p className="text-slate-700 text-sm leading-relaxed">{testResult.overview}</p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Pain points */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Pain points ({testResult.pain_points.length})
                  </p>
                  <div className="space-y-3">
                    {testResult.pain_points.map((p, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{p.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arguments */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Arguments ({testResult.arguments.length})
                  </p>
                  <div className="space-y-3">
                    {testResult.arguments.map((a, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vocabulaire</p>
                <div className="flex flex-wrap gap-2">
                  {testResult.vocabulaire.map((kw) => (
                    <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

      </main>
    </div>
  );
}
