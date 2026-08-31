"use client";

import { useState } from "react";

type Props = {
  initialProductDescription: string;
  initialIcp: string;
  initialCompanyName: string;
};

export default function GeneralSettingsClient({
  initialProductDescription,
  initialIcp,
  initialCompanyName,
}: Props) {
  const [productDescription, setProductDescription] = useState(initialProductDescription);
  const [icp, setIcp] = useState(initialIcp);
  const [companyName, setCompanyName] = useState(initialCompanyName);

  // Resynchronisation quand le serveur renvoie de nouvelles valeurs (après un
  // router.refresh(), typiquement).
  //
  // Pendant le rendu et non dans un effet : c'est exactement le bug #8
  // (« useState figé sur prop »). Dans un effet, le formulaire s'affiche un
  // tour avec les anciennes valeurs avant d'être corrigé — et si l'utilisateur
  // tape pendant ce tour, sa saisie est écrasée.
  const [syncedFrom, setSyncedFrom] = useState({
    productDescription: initialProductDescription,
    icp: initialIcp,
    companyName: initialCompanyName,
  });
  if (
    syncedFrom.productDescription !== initialProductDescription ||
    syncedFrom.icp !== initialIcp ||
    syncedFrom.companyName !== initialCompanyName
  ) {
    setSyncedFrom({
      productDescription: initialProductDescription,
      icp: initialIcp,
      companyName: initialCompanyName,
    });
    setProductDescription(initialProductDescription);
    setIcp(initialIcp);
    setCompanyName(initialCompanyName);
  }

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName || null,
          product_description: productDescription || null,
          icp: icp || null,
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] divide-y divide-slate-100">
        {/* Section profil commercial */}
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Profil commercial</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom commercial
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex : Acme Solutions"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                Utilisé pour signer les accroches et emails de suivi générés.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ce que vous vendez
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
                placeholder="Ex : Un logiciel de gestion de devis pour les artisans du bâtiment"
                className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-none leading-relaxed"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                Sert de base aux arguments commerciaux et à l&apos;accroche suggérée dans chaque brief.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Votre client idéal (ICP)
              </label>
              <input
                type="text"
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                placeholder="Ex : Directeurs commerciaux de PME de 10 à 50 personnes dans l'industrie"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 text-[color:var(--violet)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                Aide l&apos;IA à adapter le ton et les angles d&apos;approche au profil de vos prospects.
              </p>
            </div>
          </div>
        </div>

        {/* Footer bouton */}
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {saved && !error && (
            <p className="text-sm text-emerald-600 font-medium">Modifications enregistrées.</p>
          )}
          {!error && !saved && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
