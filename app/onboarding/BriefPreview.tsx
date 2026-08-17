"use client";

import { FileText, Sparkles } from "lucide-react";

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
// motive plus que masquer.

function Line({ label, value, placeholder }: { label: string; value: string; placeholder: string }) {
  const filled = value.trim().length > 0;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-[12.5px] leading-relaxed ${filled ? "text-slate-700" : "text-slate-300 italic"}`}>
        {filled ? value : placeholder}
      </p>
    </div>
  );
}

export default function BriefPreview({
  whatYouSell,
  icp,
  sector,
  companyName,
  valueProposition,
}: {
  whatYouSell: string;
  icp: string;
  sector: string;
  companyName: string;
  valueProposition: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
          <FileText className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[12.5px] font-semibold text-slate-900">Votre futur brief</p>
          <p className="text-[11px] text-slate-400">Se remplit au fur et à mesure</p>
        </div>
      </div>

      {/* Bloc figé : ce que Brief va chercher tout seul. Le montrer dès la
          première étape fait comprendre que l'essentiel du travail est
          automatique, et que les questions posées ne servent qu'à
          personnaliser. */}
      <div className="mb-4 rounded-xl bg-slate-50 px-3.5 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Sparkles className="h-3 w-3" />
          Récupéré automatiquement avant le rendez-vous
        </p>
        <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-slate-400">
          <li>· Qui est l&apos;entreprise en face, son activité, sa taille</li>
          <li>· Son actualité récente et ses données légales</li>
          <li>· L&apos;historique de vos échanges avec ce contact</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Line
          label="Ce que vous vendez"
          value={whatYouSell}
          placeholder="À renseigner — sert à cadrer vos arguments"
        />
        <Line
          label="Votre client idéal"
          value={[icp, sector].filter(Boolean).join(" · ")}
          placeholder="À renseigner — sert à repérer si le prospect y ressemble"
        />
        <Line
          label="Votre société"
          value={companyName}
          placeholder="À renseigner — apparaît dans vos emails de suivi"
        />
        <Line
          label="Votre angle"
          value={valueProposition}
          placeholder="À renseigner — la promesse que Brief reprendra"
        />
      </div>
    </div>
  );
}
