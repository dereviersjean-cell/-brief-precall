"use client";

import { Sparkles } from "lucide-react";

// Aperçu du futur brief, qui se remplit à mesure que l'utilisateur répond.
//
// C'est le cœur de l'onboarding « interactif » : sans lui, on demande à
// quelqu'un qui vient d'arriver de décrire son offre et son client idéal sans
// qu'il voie à quoi ça sert. Le lien entre la question posée et ce que Brief
// en fera reste abstrait, et on répond vite fait pour passer à la suite.
// Ici chaque réponse se matérialise immédiatement dans le document qu'il
// recevra avant ses rendez-vous.
//
// Les lignes non renseignées restent visibles en gris : montrer ce qui manque
// motive plus que masquer. La ligne de l'étape en cours est mise en avant
// (restylé le 14/10/2026, même registre que la page d'un brief).

function Line({ label, value, placeholder, active }: { label: string; value: string; placeholder: string; active: boolean }) {
  const filled = value.trim().length > 0;
  return (
    <div
      className={`rounded-2xl px-3.5 py-3 transition-colors duration-300 ${
        active ? "bg-[color:var(--lavender)] ring-1 ring-[color:var(--lavender-strong)]" : ""
      }`}
    >
      <p className={`text-[10.5px] font-semibold uppercase tracking-[0.09em] ${active ? "text-[color:var(--violet)]" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-1 text-[13.5px] leading-snug ${filled ? "font-medium text-slate-900" : "text-slate-400"}`}>
        {filled ? value : placeholder}
      </p>
    </div>
  );
}

export default function BriefPreview({
  step,
  whatYouSell,
  icp,
  sector,
  companyName,
  valueProposition,
}: {
  step: number;
  whatYouSell: string;
  icp: string;
  sector: string;
  companyName: string;
  valueProposition: string;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgba(42,92,224,0.06),0_24px_60px_-30px_rgba(42,92,224,0.45)] ring-1 ring-[color:var(--lavender-strong)]">
      {/* En-tête du document, comme l'accroche d'un brief. */}
      <div className="relative overflow-hidden px-5 py-4 text-white" style={{ background: "linear-gradient(135deg,#2A5CE0 0%,#4B3FD6 60%,#7B5CFF 100%)" }}>
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
        <p className="relative text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/70">Aperçu en direct</p>
        <p className="relative mt-0.5 text-[16px] font-semibold tracking-[-0.01em]">Votre futur brief</p>
      </div>

      <div className="space-y-1 p-3">
        <Line label="Ce que vous vendez" value={whatYouSell} placeholder="Sert à cadrer vos arguments" active={step === 1} />
        <Line
          label="Votre client idéal"
          // « Autre » ne dit rien du client : on ne l'affiche pas.
          value={[icp, sector === "Autre" ? "" : sector].filter(Boolean).join(" · ")}
          placeholder="Sert à repérer si le prospect y ressemble"
          active={step === 2}
        />
        <Line label="Votre entreprise" value={companyName} placeholder="Le nom que vos prospects connaissent" active={step === 3} />
        <Line label="Votre promesse" value={valueProposition} placeholder="L'angle que Brief reprendra" active={step === 3} />
      </div>

      {/* Ce que Brief va chercher tout seul : l'essentiel du travail est
          automatique, les questions ne servent qu'à personnaliser. */}
      <div className="mx-3 mb-3 rounded-2xl bg-slate-50 px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
          <Sparkles className="h-3 w-3 text-[color:var(--violet)]" />
          Ajouté automatiquement avant chaque rendez-vous
        </p>
        <ul className="mt-2 space-y-1 text-[12.5px] leading-relaxed text-slate-600">
          <li>L&apos;entreprise en face, son activité, sa taille</li>
          <li>Son actualité récente et ses données légales</li>
          <li>L&apos;historique de vos échanges avec ce contact</li>
        </ul>
      </div>
    </div>
  );
}
