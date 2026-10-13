"use client";

import { useState } from "react";
import { Store, FileText, Target } from "lucide-react";
import HowItWorksCard, { type PipelineStep } from "@/app/settings/_components/HowItWorksCard";
import { useModules } from "@/app/components/ModulesProvider";

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: Store,
    title: "Votre offre et votre cible",
    description: "Ce que vous vendez, à qui vous le vendez, et sous quel nom commercial vous signez.",
  },
  {
    icon: FileText,
    title: "Ajouté au prompt du brief",
    description: "Le contexte accompagne les données publiques du prospect à chaque génération.",
  },
  {
    icon: Target,
    title: "Accroche et arguments ciblés",
    description: "Les arguments relient votre offre aux besoins du prospect au lieu d'un discours passe-partout.",
  },
];

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
  const followUp = useModules().isEnabled("follow_up");
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
      <HowItWorksCard title="Profil commercial" steps={PIPELINE_STEPS}>
        Ces trois champs sont les seules choses que Brief ne peut pas deviner tout seul : il trouve l&apos;entreprise
        du prospect, son actualité et vos échanges passés, mais pas ce que{" "}
        <span className="font-medium text-slate-900">vous</span> vendez. Ils sont injectés tels quels dans le prompt
        de génération, sous forme de{" "}
        <span className="font-medium text-slate-900">contexte du commercial</span> : ce que vous vendez sert à
        formuler des arguments qui relient votre offre aux besoins réels du prospect, votre cible oriente l&apos;angle
        de qualification, et votre nom commercial signe les accroches{followUp ? " et les emails de suivi" : ""} générés. Laissés vides,
        les briefs restent corrects mais génériques — ils décrivent le prospect sans jamais le rapprocher de vous.
      </HowItWorksCard>

      <div className="divide-y divide-border rounded-2xl border border-border bg-white">
        {/* Section profil commercial */}
        <div className="px-5 py-5 sm:px-6">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Profil commercial</h2>
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Nom commercial
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex : Acme Solutions"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
              />
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
                <svg className="mt-px h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                {followUp ? "Utilisé pour signer les accroches et emails de suivi générés." : "Utilisé pour signer les accroches générées."}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Ce que vous vendez
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
                placeholder="Ex : Un logiciel de gestion de devis pour les artisans du bâtiment"
                className="w-full resize-none rounded-xl border border-border bg-white px-3.5 py-3 text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
              />
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
                <svg className="mt-px h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                Sert de base aux arguments commerciaux et à l&apos;accroche suggérée dans chaque brief.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Votre client idéal (ICP)
              </label>
              <input
                type="text"
                value={icp}
                onChange={(e) => setIcp(e.target.value)}
                placeholder="Ex : Directeurs commerciaux de PME de 10 à 50 personnes dans l'industrie"
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
              />
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500">
                <svg className="mt-px h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                Aide l&apos;IA à adapter le ton et les angles d&apos;approche au profil de vos prospects.
              </p>
            </div>
          </div>
        </div>

        {/* Footer bouton */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl px-5 py-4 sm:px-6">
          {error && (
            <p className="text-[13px] text-rose-700">{error}</p>
          )}
          {saved && !error && (
            <p className="text-[13px] font-medium text-emerald-700">Modifications enregistrées.</p>
          )}
          {!error && !saved && <span />}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
