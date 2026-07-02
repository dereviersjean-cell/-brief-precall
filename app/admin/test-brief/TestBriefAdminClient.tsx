"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { AdminNav } from "../AdminNav";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState = "loading" | "login" | "ready";

type BriefResult = {
  overview?: string;
  accroche?: string;
  pain_points?: Array<{ title: string; detail: string }>;
  arguments?: Array<{ title: string; detail: string }>;
  vocabulaire?: string[];
  actualites?: Array<{ titre: string; description: string; url?: string; source?: string; date?: string }>;
  references?: Array<{ client_name: string; relevance: string; pitch: string }>;
  historique_relationnel?: string;
};

type PappersData = {
  siren?: string;
  denomination?: string;
  date_creation?: string;
  forme_juridique?: string;
  siege_ville?: string;
  tranche_effectif?: string;
  capital?: number;
  code_naf?: string;
  libelle_code_naf?: string;
  dirigeants?: Array<{ nom?: string; prenom?: string; titre?: string }>;
};

type ReferenceUsed = {
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  similarity: number;
};

type Reasoning = {
  crm_data: null;
  pappers_data: PappersData | null;
  news_found: number;
  references_used: ReferenceUsed[];
  web_search_queries: string[];
};

type TestResult = {
  brief: BriefResult;
  reasoning: Reasoning;
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

// ─── Brief display ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-3">{children}</h3>
  );
}

function BriefDisplay({ brief }: { brief: BriefResult }) {
  return (
    <div className="space-y-5">
      {brief.overview && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Vue d&apos;ensemble</SectionTitle>
          <p className="text-sm text-slate-700 leading-relaxed">{brief.overview}</p>
        </div>
      )}

      {brief.accroche && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <SectionTitle>Accroche</SectionTitle>
          <p className="text-sm text-indigo-800 font-medium leading-relaxed">&ldquo;{brief.accroche}&rdquo;</p>
        </div>
      )}

      {brief.pain_points && brief.pain_points.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Pain points</SectionTitle>
          <ul className="space-y-3">
            {brief.pain_points.map((p, i) => (
              <li key={i} className="text-sm">
                <span className="font-semibold text-slate-800">{p.title}</span>
                <span className="text-slate-500 ml-1.5">— {p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.arguments && brief.arguments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Arguments</SectionTitle>
          <ul className="space-y-3">
            {brief.arguments.map((a, i) => (
              <li key={i} className="text-sm">
                <span className="font-semibold text-slate-800">{a.title}</span>
                <span className="text-slate-500 ml-1.5">— {a.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.vocabulaire && brief.vocabulaire.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Mots-clés métier</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {brief.vocabulaire.map((kw, i) => (
              <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {brief.actualites && brief.actualites.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Actualités</SectionTitle>
          <ul className="space-y-3">
            {brief.actualites.map((a, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-slate-800">{a.titre}</div>
                <div className="text-slate-500 text-xs mt-0.5">{a.source}{a.date ? ` · ${a.date.slice(0, 10)}` : ""}</div>
                <div className="text-slate-600 mt-1">{a.description}</div>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs hover:underline mt-0.5 inline-block">
                    Voir l&apos;article →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.references && brief.references.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <SectionTitle>Références clients</SectionTitle>
          <ul className="space-y-4">
            {brief.references.map((r, i) => (
              <li key={i} className="text-sm border-l-2 border-indigo-200 pl-3">
                <div className="font-semibold text-slate-800">{r.client_name}</div>
                <div className="text-slate-500 mt-0.5 text-xs">{r.relevance}</div>
                <div className="text-slate-700 mt-1 italic">&ldquo;{r.pitch}&rdquo;</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {brief.historique_relationnel && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
          <SectionTitle>Historique relationnel</SectionTitle>
          <p className="text-sm text-amber-800 leading-relaxed">{brief.historique_relationnel}</p>
        </div>
      )}
    </div>
  );
}

// ─── Reasoning panel ──────────────────────────────────────────────────────────

function similarityBar(score: number) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function ReasoningPanel({ reasoning }: { reasoning: Reasoning }) {
  const { pappers_data, news_found, references_used } = reasoning;

  return (
    <div className="bg-slate-50 border-l-4 border-indigo-400 rounded-xl p-5 space-y-6 text-sm">
      <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Raisonnement IA</h2>

      {/* CRM */}
      <div>
        <div className="font-medium text-slate-700 mb-1.5">CRM</div>
        <p className="text-slate-400 text-xs italic">Aucune donnée CRM (contexte admin)</p>
      </div>

      {/* Pappers */}
      <div>
        <div className="font-medium text-slate-700 mb-1.5">Données Pappers</div>
        {pappers_data ? (
          <ul className="space-y-1 text-xs text-slate-600">
            {pappers_data.denomination && <li><span className="text-slate-400">Dénomination</span> — {pappers_data.denomination}</li>}
            {pappers_data.siren && <li><span className="text-slate-400">SIREN</span> — {pappers_data.siren}</li>}
            {pappers_data.forme_juridique && <li><span className="text-slate-400">Forme</span> — {pappers_data.forme_juridique}</li>}
            {pappers_data.siege_ville && <li><span className="text-slate-400">Ville</span> — {pappers_data.siege_ville}</li>}
            {pappers_data.tranche_effectif && <li><span className="text-slate-400">Effectif</span> — {pappers_data.tranche_effectif}</li>}
            {pappers_data.libelle_code_naf && <li><span className="text-slate-400">Secteur</span> — {pappers_data.libelle_code_naf}</li>}
            {pappers_data.date_creation && <li><span className="text-slate-400">Créée le</span> — {pappers_data.date_creation.slice(0, 10)}</li>}
            {pappers_data.capital && <li><span className="text-slate-400">Capital</span> — {pappers_data.capital.toLocaleString("fr-FR")} €</li>}
            {pappers_data.dirigeants && pappers_data.dirigeants.length > 0 && (
              <li>
                <span className="text-slate-400">Dirigeant(s)</span> —{" "}
                {pappers_data.dirigeants.slice(0, 2).map((d) => [d.prenom, d.nom].filter(Boolean).join(" ") || d.titre).join(", ")}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-slate-400 text-xs italic">Aucune donnée trouvée (entreprise non française ou clé absente)</p>
        )}
      </div>

      {/* News */}
      <div>
        <div className="font-medium text-slate-700 mb-1.5">Actualités</div>
        {news_found > 0 ? (
          <p className="text-xs text-slate-600"><span className="font-semibold text-slate-800">{news_found}</span> article{news_found > 1 ? "s" : ""} récupéré{news_found > 1 ? "s" : ""}</p>
        ) : (
          <p className="text-slate-400 text-xs italic">Aucune actualité (non demandé ou aucun résultat)</p>
        )}
      </div>

      {/* References */}
      <div>
        <div className="font-medium text-slate-700 mb-1.5">
          Références clients sélectionnées
          {references_used.length === 0 && !process.env.NEXT_PUBLIC_ADMIN_TEST_USER_ID && (
            <span className="ml-1.5 font-normal text-slate-400 text-xs">(ADMIN_TEST_USER_ID non configuré)</span>
          )}
        </div>
        {references_used.length > 0 ? (
          <ul className="space-y-3">
            {references_used.map((r, i) => (
              <li key={i} className="space-y-1">
                <div className="font-medium text-slate-700 text-xs">{r.client_name ?? "Client"}</div>
                {(r.sector || r.company_size) && (
                  <div className="text-xs text-slate-400">{[r.sector, r.company_size].filter(Boolean).join(" · ")}</div>
                )}
                {r.problem && <div className="text-xs text-slate-500 line-clamp-2">Pb : {r.problem}</div>}
                {similarityBar(r.similarity)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400 text-xs italic">Aucune référence disponible</p>
        )}
      </div>

      {/* Web search */}
      <div>
        <div className="font-medium text-slate-700 mb-1.5">Recherches web Claude</div>
        <p className="text-slate-400 text-xs italic">Non exposées par l&apos;API dans ce mode</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestBriefAdminClient() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [company, setCompany] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [icp, setIcp] = useState("");
  const [includeNews, setIncludeNews] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (!res.ok) {
        setPageState("login");
        return;
      }
      setPageState("ready");
    } catch {
      setPageState("login");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/test-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          userContext:
            productDescription.trim() || icp.trim()
              ? { product_description: productDescription.trim() || null, icp: icp.trim() || null, sector: null }
              : null,
          includeNews,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur inconnue.");
      } else {
        setResult(data as TestResult);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setGenerating(false);
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <AdminNav />
      <div className="py-10 px-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test brief</h1>
          <p className="text-sm text-slate-500 mt-0.5">Génère un brief et inspecte le raisonnement du modèle</p>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Entreprise *
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ex : Salesforce, LVMH, Doctolib…"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Ce que je vends
              </label>
              <input
                type="text"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="ex : logiciel de gestion RH SaaS"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                ICP
              </label>
              <input
                type="text"
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                placeholder="ex : DRH de PME 50-200 salariés"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNews}
                onChange={(e) => setIncludeNews(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600">Inclure les actualités récentes</span>
            </label>
            <button
              type="submit"
              disabled={generating || !company.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generating && <Spinner />}
              {generating ? "Génération en cours…" : "Générer"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results: brief + reasoning side by side */}
        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Brief généré</p>
              <BriefDisplay brief={result.brief} />
            </div>
            <div className="lg:sticky lg:top-6">
              <ReasoningPanel reasoning={result.reasoning} />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
