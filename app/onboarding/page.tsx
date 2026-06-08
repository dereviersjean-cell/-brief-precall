"use client";

import { useState } from "react";
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
                <div className="flex items-center justify-end w-full">
                  <button
                    onClick={() => handleFinish(false)}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-7 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Enregistrement…" : "Commencer →"}
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
