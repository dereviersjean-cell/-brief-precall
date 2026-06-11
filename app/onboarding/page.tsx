"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const SECTOR_SUGGESTIONS = [
  "SaaS B2B",
  "Industrie",
  "BTP",
  "Finance",
  "RH",
  "Marketing",
  "Autre",
];

const STEPS = [
  {
    step: 1,
    title: "Qu'est-ce que vous vendez ?",
    subtitle: "Décrivez votre produit ou service en quelques mots.",
  },
  {
    step: 2,
    title: "À qui vous le vendez ?",
    subtitle: "Décrivez votre client idéal et choisissez votre secteur.",
  },
  {
    step: 3,
    title: "Comment vous présentez-vous ?",
    subtitle: "Ces informations personnaliseront vos briefs.",
  },
  {
    step: 4,
    title: "Vos références clients",
    subtitle: "Importez des cas clients pour personnaliser vos arguments de vente.",
  },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < current ? "bg-indigo-600" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [whatYouSell, setWhatYouSell] = useState("");
  const [icp, setIcp] = useState("");
  const [sector, setSector] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [refMode, setRefMode] = useState<"upload" | "text" | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refText, setRefText] = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = STEPS.length;
  const isLast = step === totalSteps;

  function advance() {
    if (!isLast) {
      setStep((s) => s + 1);
    }
  }

  async function handleFinish(skip = false) {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: skip ? null : companyName || null,
          product_description: skip ? null : valueProposition || whatYouSell || null,
          icp: skip ? null : icp || null,
          sector: skip ? null : sector || null,
        }),
      });
    } catch {
      // Best-effort — on redirige quoi qu'il arrive
    } finally {
      setSaving(false);
      router.push("/dashboard");
    }
  }

  async function handleImport() {
    if (!refFile && !refText.trim()) return;
    setRefLoading(true);
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || null,
          product_description: valueProposition || whatYouSell || null,
          icp: icp || null,
          sector: sector || null,
        }),
      });

      const payload: Record<string, string> = {
        source: refFile ? "upload" : "manual",
      };
      if (refFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(refFile!);
        });
        payload.file = base64;
        payload.fileType = refFile.type;
      } else {
        payload.text = refText;
      }
      await fetch("/api/onboarding/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Best-effort
    } finally {
      setRefLoading(false);
      setSaving(false);
      router.push("/dashboard");
    }
  }

  const { title, subtitle } = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="font-semibold text-slate-900">Brief</span>
          </div>
          <button
            onClick={() => handleFinish(true)}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Ignorer l&apos;onboarding
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Progress */}
          <ProgressBar current={step} total={totalSteps} />

          {/* Step indicator */}
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">
            Étape {step} sur {totalSteps}
          </p>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-xl font-bold text-slate-900 mb-1">{title}</h1>
            <p className="text-sm text-slate-500 mb-6">{subtitle}</p>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <textarea
                value={whatYouSell}
                onChange={(e) => setWhatYouSell(e.target.value)}
                autoFocus
                rows={4}
                placeholder="Ex : Un logiciel de gestion de devis pour les artisans du bâtiment"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Votre client idéal
                  </label>
                  <input
                    type="text"
                    value={icp}
                    onChange={(e) => setIcp(e.target.value)}
                    autoFocus
                    placeholder="Ex : Directeurs commerciaux de PME de 10 à 50 personnes dans l'industrie"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Secteur
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SECTOR_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSector(s === sector ? "" : s)}
                        className={`text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                          sector === s
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom commercial
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                    placeholder="Ex : Acme Solutions"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Votre proposition de valeur en une phrase
                  </label>
                  <input
                    type="text"
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    placeholder="Ex : Nous aidons les artisans à créer des devis professionnels en 2 minutes"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* ── Step 4 ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setRefMode("upload"); setRefFile(null); }}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      refMode === "upload"
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Importer un fichier</p>
                    <p className="text-xs text-slate-400">PDF, Word, Excel</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setRefMode("text"); setRefFile(null); }}
                    className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${
                      refMode === "text"
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">Saisie libre</p>
                    <p className="text-xs text-slate-400">Copier-coller du texte</p>
                  </button>
                </div>

                {refMode === "upload" && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => setRefFile(e.target.files?.[0] ?? null)}
                    />
                    {refFile ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-indigo-700 font-medium flex-1 truncate">{refFile.name}</p>
                        <button
                          type="button"
                          onClick={() => setRefFile(null)}
                          className="text-xs text-indigo-400 hover:text-indigo-600"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-slate-500 text-sm"
                      >
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Cliquez pour sélectionner un fichier
                      </button>
                    )}
                  </div>
                )}

                {refMode === "text" && (
                  <textarea
                    value={refText}
                    onChange={(e) => setRefText(e.target.value)}
                    autoFocus
                    rows={5}
                    placeholder="Collez ici vos références clients : nom du client, secteur, problème résolu, résultats obtenus..."
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                )}
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between mt-8">
              {!isLast ? (
                <>
                  <button
                    onClick={advance}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Passer
                  </button>
                  <button
                    onClick={advance}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Continuer
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <button
                    onClick={() => handleFinish(false)}
                    disabled={saving || refLoading}
                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                  >
                    Passer cette étape
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={saving || refLoading || (!refFile && !refText.trim())}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-7 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refLoading ? "Import en cours…" : "Importer et continuer →"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  s.step === step ? "bg-indigo-600 w-4" : "bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
