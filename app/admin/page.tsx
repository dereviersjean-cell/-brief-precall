"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode, FormEvent } from "react";
import { AdminConfig, DEFAULT_CONFIG } from "@/lib/admin-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type BriefResult = {
  overview?: string;
  accroche?: string;
  pain_points?: Array<{ title: string; detail: string }>;
  arguments?: Array<{ title: string; detail: string }>;
  vocabulaire?: string[];
  actualites?: Array<{ titre: string; description: string; url?: string; source?: string; date?: string }>;
};

type HistoryEntry = {
  id: string;
  company: string;
  config: AdminConfig;
  brief: BriefResult;
  testedAt: string;
};

type AdminState = "loading" | "login" | "ready";

const HISTORY_KEY = "admin_test_history";

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-opus-4-8": "Opus 4.8",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">
      {children}
    </h2>
  );
}

// ─── Config controls ──────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-indigo-600 w-6 text-center tabular-nums">{value}</span>
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
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function ToggleGroup<T extends string>({
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
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
              value === o.value
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-slate-200 text-slate-600 hover:border-indigo-300 bg-white"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Brief display ────────────────────────────────────────────────────────────

function ConfigBadges({ config, className = "" }: { config: AdminConfig; className?: string }) {
  const items = [
    { label: MODEL_LABELS[config.model] ?? config.model, cls: "bg-indigo-50 text-indigo-700 border-indigo-100" },
    { label: `${config.painPointsCount} pain points`, cls: "bg-rose-50 text-rose-700 border-rose-100" },
    { label: `${config.argumentsCount} arguments`, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: config.tone, cls: "bg-amber-50 text-amber-700 border-amber-100" },
    { label: `Overview ${config.overviewLength}`, cls: "bg-slate-50 text-slate-500 border-slate-200" },
  ];
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => (
        <span key={item.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${item.cls}`}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function BriefDisplay({ brief }: { brief: BriefResult }) {
  return (
    <div className="space-y-4 text-sm">
      {brief.accroche && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1.5">Accroche</p>
          <p className="text-slate-800 font-medium leading-relaxed">&ldquo;{brief.accroche}&rdquo;</p>
        </div>
      )}

      {brief.overview && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Vue d&apos;ensemble</p>
          <p className="text-slate-700 leading-relaxed">{brief.overview}</p>
        </div>
      )}

      {((brief.pain_points?.length ?? 0) > 0 || (brief.arguments?.length ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          {brief.pain_points && brief.pain_points.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Pain points ({brief.pain_points.length})
              </p>
              <div className="space-y-3">
                {brief.pain_points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-snug">{p.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.arguments && brief.arguments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Arguments ({brief.arguments.length})
              </p>
              <div className="space-y-3">
                {brief.arguments.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800 leading-snug">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {brief.vocabulaire && brief.vocabulaire.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Mots-clés</p>
          <div className="flex flex-wrap gap-1.5">
            {brief.vocabulaire.map((kw) => (
              <span key={kw} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.actualites && brief.actualites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Actualités</p>
          <div className="space-y-2.5">
            {brief.actualites.map((a, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  {a.source && (
                    <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-medium">
                      {a.source}
                    </span>
                  )}
                  {a.date && <span className="text-xs text-slate-400">{a.date}</span>}
                </div>
                <p className="text-xs font-semibold text-slate-800">{a.titre}</p>
                {a.description && <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                    Lire →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History accordion item ───────────────────────────────────────────────────

function HistoryItem({
  entry,
  isOpen,
  onToggle,
}: {
  entry: HistoryEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-slate-900 text-sm">{entry.company}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span>{MODEL_LABELS[entry.config.model] ?? entry.config.model}</span>
            <span>·</span>
            <span>{entry.config.painPointsCount} pain points</span>
            <span>·</span>
            <span>{entry.config.argumentsCount} arguments</span>
            <span>·</span>
            <span>{formatDate(entry.testedAt)}</span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <ConfigBadges config={entry.config} className="mt-4 mb-4" />
          <BriefDisplay brief={entry.brief} />
        </div>
      )}
    </div>
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

// ─── Admin panel ──────────────────────────────────────────────────────────────

function AdminPanel({ initialConfig }: { initialConfig: AdminConfig }) {
  const [config, setConfig] = useState<AdminConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle");

  const [testCompany, setTestCompany] = useState("");
  const [testProductDesc, setTestProductDesc] = useState("");
  const [testIcp, setTestIcp] = useState("");
  const [includeNews, setIncludeNews] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const [liveEntry, setLiveEntry] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored) as HistoryEntry[]);
    } catch {}

    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data: { profile?: { product_description?: string | null; icp?: string | null } | null }) => {
        if (data.profile) {
          setTestProductDesc(data.profile.product_description ?? "");
          setTestIcp(data.profile.icp ?? "");
        }
      })
      .catch(() => {});
  }, []);

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
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handleTest() {
    if (!testCompany.trim()) return;
    setTestLoading(true);
    setTestError(null);
    try {
      const res = await fetch("/api/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: testCompany.trim(),
          config,
          includeNews,
          userContext: (testProductDesc.trim() || testIcp.trim())
            ? { product_description: testProductDesc.trim() || null, icp: testIcp.trim() || null, sector: null }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestError((data as { error?: string }).error ?? "Erreur inconnue.");
      } else {
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          company: testCompany.trim(),
          config: { ...config },
          brief: data as BriefResult,
          testedAt: new Date().toISOString(),
        };
        setLiveEntry(entry);
        setHistory((prev) => {
          const updated = [entry, ...prev].slice(0, 3);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
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

  function handleReset() {
    if (!confirm("Réinitialiser la configuration par défaut ?")) return;
    setConfig(DEFAULT_CONFIG);
    setSaveStatus("idle");
  }

  // Entry shown in main card: live (just tested) or latest from localStorage on reload
  const displayEntry = liveEntry ?? (history.length > 0 ? history[0] : null);
  // Accordion: previous entries, excluding the one displayed in main card
  const previousEntries = history.filter((h) => h.id !== displayEntry?.id).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900">Brief</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-500">Administration</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-5 gap-8 items-start">

          {/* ── Left column: config (40%) ── */}
          <div className="col-span-2 space-y-5 sticky top-20">

            {/* System prompt */}
            <Card>
              <SectionTitle>Prompt système</SectionTitle>
              <div className="relative">
                <textarea
                  value={config.systemPrompt}
                  onChange={(e) => patch("systemPrompt", e.target.value)}
                  rows={7}
                  spellCheck={false}
                  className="w-full bg-gray-50 text-slate-800 font-mono text-xs px-4 py-3 rounded-lg border border-gray-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
                <span className="absolute bottom-3 right-3 text-xs text-slate-500 pointer-events-none">
                  {config.systemPrompt.length} car.
                </span>
              </div>
            </Card>

            {/* Modèle & Génération */}
            <Card>
              <SectionTitle>Modèle & Génération</SectionTitle>
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {(["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-8"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => patch("model", m)}
                      className={`py-2.5 px-2 rounded-lg border text-xs font-medium transition-all text-center ${
                        config.model === m
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-200 text-slate-600 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      {MODEL_LABELS[m]}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <SliderField label="Pain points" value={config.painPointsCount} min={1} max={6} onChange={(v) => patch("painPointsCount", v)} />
                  <SliderField label="Arguments" value={config.argumentsCount} min={1} max={6} onChange={(v) => patch("argumentsCount", v)} />
                  <SliderField label="Mots-clés" value={config.keywordsCount} min={3} max={10} onChange={(v) => patch("keywordsCount", v)} />
                </div>
              </div>
            </Card>

            {/* Style & Ton */}
            <Card>
              <SectionTitle>Style & Ton</SectionTitle>
              <div className="space-y-5">
                <ToggleGroup
                  label="Longueur de l'overview"
                  value={config.overviewLength}
                  options={[
                    { value: "court", label: "Court" },
                    { value: "moyen", label: "Moyen" },
                    { value: "long", label: "Long" },
                  ]}
                  onChange={(v) => patch("overviewLength", v)}
                />
                <ToggleGroup
                  label="Ton du brief"
                  value={config.tone}
                  options={[
                    { value: "formel", label: "Formel" },
                    { value: "professionnel", label: "Pro." },
                    { value: "direct", label: "Direct" },
                  ]}
                  onChange={(v) => patch("tone", v)}
                />
              </div>
            </Card>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving && <Spinner />}
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Applique les changements à tous les utilisateurs
              </span>
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

          {/* ── Right column: test + history (60%) ── */}
          <div className="col-span-3 space-y-5">

            {/* Test zone */}
            <Card>
              <SectionTitle>Zone de test</SectionTitle>

              {/* Profil commercial testé */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Profil commercial testé
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ce que je vends</label>
                  <textarea
                    value={testProductDesc}
                    onChange={(e) => setTestProductDesc(e.target.value)}
                    rows={2}
                    placeholder="Ex : Un logiciel de gestion de devis pour artisans"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mon client idéal (ICP)</label>
                  <input
                    type="text"
                    value={testIcp}
                    onChange={(e) => setTestIcp(e.target.value)}
                    placeholder="Ex : Directeurs commerciaux de PME industrielles"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <input
                  type="text"
                  value={testCompany}
                  onChange={(e) => setTestCompany(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && testCompany.trim()) handleTest(); }}
                  placeholder="Nom de l'entreprise à tester…"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={includeNews}
                      onClick={() => setIncludeNews((v) => !v)}
                      className={`relative inline-flex w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                        includeNews ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ml-0.5 ${
                          includeNews ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-sm text-slate-600">Inclure les actualités</span>
                  </label>
                  <button
                    onClick={handleTest}
                    disabled={testLoading || !testCompany.trim()}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {testLoading ? <Spinner /> : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {testLoading ? "Génération…" : "Tester"}
                  </button>
                </div>
              </div>

              {testLoading && (
                <div className="flex items-center gap-3 py-10 justify-center text-slate-400 border-t border-slate-100">
                  <Spinner className="w-5 h-5" />
                  <span className="text-sm">Génération avec {MODEL_LABELS[config.model] ?? config.model}…</span>
                </div>
              )}

              {testError && !testLoading && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {testError}
                </div>
              )}

              {displayEntry && !testLoading && (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500">
                      Résultat pour{" "}
                      <span className="font-semibold text-slate-900">{displayEntry.company}</span>
                      <span className="ml-2 text-slate-400">· {formatDate(displayEntry.testedAt)}</span>
                    </p>
                  </div>
                  <ConfigBadges config={displayEntry.config} className="mb-5" />
                  <div className="max-h-[600px] overflow-y-auto pr-1">
                    <BriefDisplay brief={displayEntry.brief} />
                  </div>
                </div>
              )}
            </Card>

            {/* History */}
            {previousEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest px-1">
                  Historique
                </h3>
                {previousEntries.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    isOpen={openHistoryId === entry.id}
                    onToggle={() => setOpenHistoryId(openHistoryId === entry.id ? null : entry.id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Page orchestrator ────────────────────────────────────────────────────────

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
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Spinner className="w-6 h-6 text-indigo-600" />
      </div>
    );
  }

  if (state === "login") {
    return <LoginForm onSuccess={fetchConfig} />;
  }

  return <AdminPanel initialConfig={config ?? DEFAULT_CONFIG} />;
}
