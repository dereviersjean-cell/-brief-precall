"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminConfig, DEFAULT_CONFIG } from "@/lib/admin-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type BriefPreview = {
  overview?: string;
  accroche?: string;
  pain_points?: Array<{ title: string; detail: string }>;
  arguments?: Array<{ title: string; detail: string }>;
  vocabulaire?: string[];
};

type AdminState = "loading" | "login" | "ready";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-indigo-600 w-5 text-center">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
        setError(data.error ?? "Erreur inconnue.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Accès réservé</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mot de passe admin
            </label>
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
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
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

// ─── Brief preview ────────────────────────────────────────────────────────────

function BriefPreviewPanel({ brief }: { brief: BriefPreview }) {
  return (
    <div className="space-y-4 text-sm">
      {brief.accroche && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Accroche</p>
          <p className="text-slate-800 font-medium leading-relaxed">&ldquo;{brief.accroche}&rdquo;</p>
        </div>
      )}

      {brief.overview && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vue d&apos;ensemble</p>
          <p className="text-slate-700 leading-relaxed">{brief.overview}</p>
        </div>
      )}

      {brief.pain_points && brief.pain_points.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pain points</p>
          <div className="space-y-3">
            {brief.pain_points.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">{p.title}</p>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{p.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {brief.arguments && brief.arguments.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Arguments</p>
          <div className="space-y-3">
            {brief.arguments.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">{a.title}</p>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {brief.vocabulaire && brief.vocabulaire.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vocabulaire</p>
          <div className="flex flex-wrap gap-2">
            {brief.vocabulaire.map((kw) => (
              <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin panel ──────────────────────────────────────────────────────────────

function AdminPanel({ initialConfig }: { initialConfig: AdminConfig }) {
  const [config, setConfig] = useState<AdminConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle");

  const [testCompany, setTestCompany] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<BriefPreview | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  function patch<K extends keyof AdminConfig>(key: K, value: AdminConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaveStatus(res.ok ? "ok" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testCompany.trim()) return;
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
      if (res.ok) {
        setTestResult(data as BriefPreview);
      } else {
        setTestError(data.error ?? "Erreur inconnue.");
      }
    } catch {
      setTestError("Impossible de contacter le serveur.");
    } finally {
      setTestLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  async function handleReset() {
    if (!confirm("Réinitialiser la configuration par défaut ?")) return;
    setConfig(DEFAULT_CONFIG);
    setSaveStatus("idle");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900">Brief</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-600">Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 gap-8 items-start">
        {/* ── Left: Config editor ── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Prompt système
            </h2>
            <textarea
              value={config.systemPrompt}
              onChange={(e) => patch("systemPrompt", e.target.value)}
              rows={7}
              className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Modèle & Génération
            </h2>

            <SelectField
              label="Modèle Claude"
              value={config.model}
              options={[
                { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (défaut)" },
                { value: "claude-opus-4-8", label: "Claude Opus 4.8 (plus puissant)" },
                { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (plus rapide)" },
              ]}
              onChange={(v) => patch("model", v)}
            />

            <SliderField
              label="Nombre de pain points"
              value={config.painPointsCount}
              min={1}
              max={6}
              onChange={(v) => patch("painPointsCount", v)}
            />

            <SliderField
              label="Nombre d'arguments"
              value={config.argumentsCount}
              min={1}
              max={6}
              onChange={(v) => patch("argumentsCount", v)}
            />

            <SliderField
              label="Nombre de mots-clés"
              value={config.keywordsCount}
              min={3}
              max={10}
              onChange={(v) => patch("keywordsCount", v)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Style & Ton
            </h2>

            <SelectField
              label="Longueur de l'overview"
              value={config.overviewLength}
              options={[
                { value: "court", label: "Court (2 phrases)" },
                { value: "moyen", label: "Moyen (2-3 phrases)" },
                { value: "long", label: "Long (4-5 phrases)" },
              ]}
              onChange={(v) => patch("overviewLength", v)}
            />

            <SelectField
              label="Ton du brief"
              value={config.tone}
              options={[
                { value: "formel", label: "Formel et soutenu" },
                { value: "professionnel", label: "Professionnel et accessible" },
                { value: "direct", label: "Direct et concis" },
              ]}
              onChange={(v) => patch("tone", v)}
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving && <Spinner />}
              {saving ? "Sauvegarde…" : "Sauvegarder la configuration"}
            </button>
            {saveStatus === "ok" && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Sauvegardé
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-600">Erreur lors de la sauvegarde.</span>
            )}
          </div>
        </div>

        {/* ── Right: Test zone ── */}
        <div className="space-y-4 sticky top-20">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Zone de test
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Testez la configuration courante sans la sauvegarder.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                placeholder="Nom de l'entreprise…"
                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testCompany.trim()) handleTest();
                }}
              />
              <button
                onClick={handleTest}
                disabled={testLoading || !testCompany.trim()}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {testLoading ? <Spinner /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                Tester
              </button>
            </div>

            {testLoading && (
              <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                <Spinner className="w-5 h-5" />
                <span className="text-sm">Génération en cours…</span>
              </div>
            )}

            {testError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {testError}
              </div>
            )}
          </div>

          {testResult && !testLoading && (
            <BriefPreviewPanel brief={testResult} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [state, setState] = useState<AdminState>("loading");
  const [config, setConfig] = useState<AdminConfig | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.status === 401) {
        setState("login");
      } else if (res.ok) {
        setConfig(await res.json());
        setState("ready");
      } else {
        setState("login");
      }
    } catch {
      setState("login");
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner className="w-6 h-6 text-indigo-600" />
      </div>
    );
  }

  if (state === "login") {
    return <LoginForm onSuccess={fetchConfig} />;
  }

  return <AdminPanel initialConfig={config ?? DEFAULT_CONFIG} />;
}
