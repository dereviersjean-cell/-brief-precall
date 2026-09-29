"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, Minus, Plus, RotateCcw, Settings2, Sparkles } from "lucide-react";
import { AdminConfig, DEFAULT_CONFIG } from "@/lib/admin-config";
import { Spinner, AdminLoginForm, AdminPageShell, AdminPageHeader, ADMIN_INPUT } from "@/app/admin/AdminShell";
import { Button, Card } from "@/app/components/ui/ui-bits";
import FadeIn from "@/app/dashboard/FadeIn";

// Réglages du brief : ce qui s'applique à tous les briefs de tous les clients
// (prompt, modèle, contenu, ton), avec une zone pour tester un réglage sur
// une vraie entreprise AVANT de l'enregistrer.

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
  seconds?: number;
};

type AdminState = "loading" | "login" | "ready";

const HISTORY_KEY = "admin_test_history";

// Les anciens libellés restent pour afficher l'historique des tests. Haiku
// n'est plus proposé : il ne sait pas faire la recherche web utilisée par le
// brief (web_search_20260209), la génération échouait.
const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-opus-5-5": "Opus 5.5",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-opus-4-8": "Opus 4.8",
  "claude-haiku-4-5-20251001": "Haiku 4.5",
};

// Repères mesurés le 29/09/2026 sur 5 vrais prospects (voir CLAUDE.md) : ce
// qu'il faut savoir pour choisir, sans aller relire la documentation.
const MODEL_OPTIONS: Array<{ value: string; label: string; hint: string; recommended?: boolean }> = [
  { value: "claude-sonnet-5-5", label: "Sonnet 5.5", hint: "~27 s · ~0,13 $ par brief", recommended: true },
  { value: "claude-opus-5-5", label: "Opus 5.5", hint: "Plus poussé · ~2× le coût" },
  { value: "claude-sonnet-4-6", label: "Sonnet 4.6", hint: "Ancienne génération · ~60 s" },
];

const TONE_LABELS: Record<AdminConfig["tone"], string> = {
  formel: "Formel",
  professionnel: "Professionnel",
  direct: "Direct",
};

const LENGTH_LABELS: Record<AdminConfig["overviewLength"], string> = {
  court: "Courte",
  moyen: "Moyenne",
  long: "Longue",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// ─── Petits composants ────────────────────────────────────────────────────────

function CardHeading({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

// Nombre d'éléments : un compteur plutôt qu'un curseur — sur une plage de 1 à
// 6, on vise une valeur précise, on ne balaie pas.
function Stepper({
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
  const btn =
    "grid h-7 w-7 place-items-center rounded-md border border-border bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13.5px] text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Moins de ${label.toLowerCase()}`}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center text-[14px] font-semibold tabular-nums text-slate-900">{value}</span>
        <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Plus de ${label.toLowerCase()}`}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
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
      <p className="mb-2 text-[13px] font-medium text-slate-700">{label}</p>
      <div className="flex rounded-lg border border-border bg-slate-50 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-medium transition-all ${
              value === o.value ? "bg-white text-[color:var(--violet)] shadow-[var(--shadow-sm)]" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigSummary({ config, seconds }: { config: AdminConfig; seconds?: number }) {
  const parts = [
    MODEL_LABELS[config.model] ?? config.model,
    `${config.painPointsCount} hypothèses`,
    `${config.argumentsCount} arguments`,
    `${config.keywordsCount} mots`,
    `ton ${TONE_LABELS[config.tone]?.toLowerCase() ?? config.tone}`,
    ...(seconds ? [`${seconds} s`] : []),
  ];
  return <p className="text-[12px] text-slate-400">{parts.join(" · ")}</p>;
}

// ─── Affichage d'un brief de test ─────────────────────────────────────────────
// Mêmes sections que le brief du commercial, dans le même ordre : ce qu'on
// juge ici, c'est ce qu'il lira.

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400">{children}</p>;
}

function BriefDisplay({ brief }: { brief: BriefResult }) {
  return (
    <div className="space-y-6 text-[13.5px]">
      {brief.accroche && (
        <div className="rounded-xl border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] p-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[color:var(--violet)]">Accroche</p>
          <p className="font-medium leading-relaxed text-slate-900">« {brief.accroche} »</p>
        </div>
      )}

      {brief.overview && (
        <div>
          <SectionLabel>Présentation de l&apos;entreprise</SectionLabel>
          <p className="leading-relaxed text-slate-700">{brief.overview}</p>
        </div>
      )}

      {brief.pain_points && brief.pain_points.length > 0 && (
        <div>
          <SectionLabel>Hypothèses à vérifier ({brief.pain_points.length})</SectionLabel>
          <ul className="space-y-3">
            {brief.pain_points.map((p, i) => (
              <li key={i} className="rounded-xl border border-border p-3.5">
                <p className="font-semibold leading-snug text-slate-900">{p.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{p.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.arguments && brief.arguments.length > 0 && (
        <div>
          <SectionLabel>Arguments ({brief.arguments.length})</SectionLabel>
          <ul className="space-y-3">
            {brief.arguments.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--violet)]" />
                <div>
                  <p className="font-semibold leading-snug text-slate-900">{a.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.vocabulaire && brief.vocabulaire.length > 0 && (
        <div>
          <SectionLabel>Vocabulaire du métier</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {brief.vocabulaire.map((kw) => (
              <span key={kw} className="rounded-full border border-border bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.actualites && brief.actualites.length > 0 && (
        <div>
          <SectionLabel>Actualités</SectionLabel>
          <div className="space-y-2.5">
            {brief.actualites.map((a, i) => (
              <div key={i} className="rounded-xl border border-border bg-slate-50/60 p-3">
                <p className="text-[11.5px] text-slate-400">{[a.source, a.date].filter(Boolean).join(" · ")}</p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{a.titre}</p>
                {a.description && <p className="mt-0.5 text-[12.5px] text-slate-600">{a.description}</p>}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
                    Lire l&apos;article →
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

function HistoryItem({ entry, isOpen, onToggle }: { entry: HistoryEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-xs)]">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-slate-900">{entry.company}</p>
          <p className="mt-0.5 text-[12px] text-slate-400">
            {formatDate(entry.testedAt)} · {MODEL_LABELS[entry.config.model] ?? entry.config.model}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <div className="mb-4">
            <ConfigSummary config={entry.config} seconds={entry.seconds} />
          </div>
          <BriefDisplay brief={entry.brief} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminPanel({ initialConfig }: { initialConfig: AdminConfig }) {
  const [config, setConfig] = useState<AdminConfig>(initialConfig);
  // Dernière version enregistrée : sert à signaler les modifications en
  // attente, pour ne pas quitter la page en croyant avoir enregistré.
  const [savedConfig, setSavedConfig] = useState<AdminConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle");

  const [testCompany, setTestCompany] = useState("");
  const [testProductDesc, setTestProductDesc] = useState("");
  const [testIcp, setTestIcp] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [includeNews, setIncludeNews] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const [liveEntry, setLiveEntry] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

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
      if (res.ok) setSavedConfig(config);
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
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: testCompany.trim(),
          config,
          includeNews,
          userContext:
            testProductDesc.trim() || testIcp.trim()
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
          seconds: Math.round((Date.now() - startedAt) / 1000),
        };
        setLiveEntry(entry);
        setHistory((prev) => {
          const updated = [entry, ...prev].slice(0, 3);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {
      setTestError("Impossible de contacter le serveur.");
    } finally {
      setTestLoading(false);
    }
  }

  function handleReset() {
    if (!confirm("Remettre les réglages par défaut ? Rien n'est enregistré tant que vous ne cliquez pas sur Enregistrer.")) return;
    setConfig(DEFAULT_CONFIG);
    setSaveStatus("idle");
  }

  // Le brief affiché : celui qu'on vient de tester, ou le dernier de
  // l'historique au rechargement.
  const displayEntry = liveEntry ?? (history.length > 0 ? history[0] : null);
  const previousEntries = history.filter((h) => h.id !== displayEntry?.id).slice(0, 2);

  return (
    <AdminPageShell>
      <FadeIn>
        <AdminPageHeader
          icon={Settings2}
          eyebrow="Outils techniques"
          title="Réglages du brief"
          subtitle="Appliqués à tous les briefs de tous les clients dès l'enregistrement."
          actions={
            <>
              {saveStatus === "ok" && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
                  <Check className="h-4 w-4" strokeWidth={2.5} /> Enregistré
                </span>
              )}
              {saveStatus === "error" && <span className="text-[13px] text-rose-600">Échec de l&apos;enregistrement.</span>}
              {dirty && saveStatus === "idle" && (
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--warning)]" /> Modifications non enregistrées
                </span>
              )}
              <Button variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={handleReset}>
                Réglages par défaut
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving || !dirty} icon={saving ? <Spinner /> : undefined}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </>
          }
        />
      </FadeIn>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Réglages ── */}
        <div className="space-y-5">
          <Card>
            <CardHeading
              title="Prompt"
              hint="Le rôle et la méthode, communs à tous les clients. Le format, le nombre d'éléments, le vocabulaire du métier et les hypothèses sont imposés par le code : inutile de les répéter ici. N'y indiquez aucun secteur."
            />
            <textarea
              value={config.systemPrompt}
              onChange={(e) => patch("systemPrompt", e.target.value)}
              rows={12}
              spellCheck={false}
              className={`${ADMIN_INPUT} resize-y leading-relaxed`}
            />
            <p className="mt-1.5 text-right text-[11.5px] text-slate-400">{config.systemPrompt.length} caractères</p>
          </Card>

          <Card>
            <CardHeading title="Modèle" />
            <div className="space-y-2">
              {MODEL_OPTIONS.map((m) => {
                const selected = config.model === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => patch("model", m.value)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-[color:var(--violet)] bg-[color:var(--lavender)] ring-1 ring-[color:var(--violet)]"
                        : "border-border bg-white hover:border-[color:var(--lavender-strong)]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full border ${
                          selected ? "border-[color:var(--violet)]" : "border-slate-300"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-[color:var(--violet)]" />}
                      </span>
                      <span>
                        <span className="text-[13.5px] font-semibold text-slate-900">{m.label}</span>
                        {m.recommended && (
                          <span className="ml-2 rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                            Recommandé
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-[12px] text-slate-500">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeading title="Contenu du brief" />
            <div className="divide-y divide-border">
              <Stepper label="Hypothèses à vérifier" value={config.painPointsCount} min={1} max={6} onChange={(v) => patch("painPointsCount", v)} />
              <Stepper label="Arguments" value={config.argumentsCount} min={1} max={6} onChange={(v) => patch("argumentsCount", v)} />
              <Stepper label="Mots de vocabulaire" value={config.keywordsCount} min={3} max={10} onChange={(v) => patch("keywordsCount", v)} />
            </div>
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <Segmented
                label="Longueur de la présentation"
                value={config.overviewLength}
                options={(Object.keys(LENGTH_LABELS) as AdminConfig["overviewLength"][]).map((v) => ({ value: v, label: LENGTH_LABELS[v] }))}
                onChange={(v) => patch("overviewLength", v)}
              />
              <Segmented
                label="Ton"
                value={config.tone}
                options={(Object.keys(TONE_LABELS) as AdminConfig["tone"][]).map((v) => ({ value: v, label: TONE_LABELS[v] }))}
                onChange={(v) => patch("tone", v)}
              />
            </div>
          </Card>
        </div>

        {/* ── Test ── */}
        <div className="space-y-5 xl:sticky xl:top-8">
          <Card>
            <CardHeading
              title="Tester sur une entreprise"
              hint="Le test utilise les réglages affichés, même non enregistrés : essayez avant d'appliquer à tout le monde."
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={testCompany}
                onChange={(e) => setTestCompany(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testCompany.trim()) void handleTest();
                }}
                placeholder="Nom de l'entreprise, ex. Medicalib"
                className={ADMIN_INPUT}
              />
              {/* Bouton à la hauteur du champ voisin (Button est plus bas). */}
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={testLoading || !testCompany.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg brand-gradient px-4 text-[13px] font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testLoading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                {testLoading ? "Génération…" : "Générer"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeNews}
                  onClick={() => setIncludeNews((v) => !v)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${includeNews ? "bg-[color:var(--violet)]" : "bg-slate-200"}`}
                >
                  <span
                    className={`ml-0.5 mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      includeNews ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-[13px] text-slate-600">Inclure les actualités</span>
              </label>
              <button
                type="button"
                onClick={() => setShowProfile((v) => !v)}
                className="flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-800"
              >
                Profil commercial du test
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showProfile ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showProfile && (
              <div className="mt-3 space-y-3 rounded-xl border border-border bg-slate-50/60 p-4">
                <div>
                  <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Ce que vend le commercial</label>
                  <textarea
                    value={testProductDesc}
                    onChange={(e) => setTestProductDesc(e.target.value)}
                    rows={2}
                    placeholder="Ex : un logiciel de gestion de devis pour artisans"
                    className={`${ADMIN_INPUT} resize-none`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Sa cible</label>
                  <input
                    type="text"
                    value={testIcp}
                    onChange={(e) => setTestIcp(e.target.value)}
                    placeholder="Ex : directeurs commerciaux de PME industrielles"
                    className={ADMIN_INPUT}
                  />
                </div>
              </div>
            )}

            {testLoading && (
              <div className="mt-5 flex items-center justify-center gap-3 border-t border-border py-12 text-slate-500">
                <Spinner className="h-5 w-5 text-[color:var(--violet)]" />
                <span className="text-[13px]">
                  Recherche et rédaction avec {MODEL_LABELS[config.model] ?? config.model}… environ 30 secondes.
                </span>
              </div>
            )}

            {testError && !testLoading && (
              <div className="mt-5 rounded-xl border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] p-4 text-[13px] text-rose-700">
                {testError}
              </div>
            )}

            {displayEntry && !testLoading && (
              <div className="mt-5 border-t border-border pt-5">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[15px] font-semibold text-slate-900">{displayEntry.company}</p>
                  <ConfigSummary config={displayEntry.config} seconds={displayEntry.seconds} />
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-1">
                  <BriefDisplay brief={displayEntry.brief} />
                </div>
              </div>
            )}

            {!displayEntry && !testLoading && !testError && (
              <p className="mt-5 rounded-xl border border-dashed border-border py-10 text-center text-[13px] text-slate-400">
                Le brief de test s&apos;affichera ici.
              </p>
            )}
          </Card>

          {previousEntries.length > 0 && (
            <div className="space-y-2.5">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Tests précédents</p>
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
    </AdminPageShell>
  );
}

// ─── Page orchestrator ────────────────────────────────────────────────────────

export default function ConfigAdminClient() {
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
      <div className="brief-ui flex min-h-screen items-center justify-center bg-[color:var(--background)]">
        <Spinner className="h-6 w-6 text-[color:var(--violet)]" />
      </div>
    );
  }

  if (state === "login") {
    return <AdminLoginForm onSuccess={fetchConfig} />;
  }

  return <AdminPanel initialConfig={config ?? DEFAULT_CONFIG} />;
}
