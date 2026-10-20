import { Check } from "lucide-react";

// Ce qui se passe une fois la connexion faite — en deux ou trois lignes,
// sous le titre de chaque carte de la page Connexions (demande de Jean,
// 20/10/2026) : le bouton « Connecter » seul ne disait pas ce qu'on
// déclenchait.
export default function OnceConnected({ items }: { items: string[] }) {
  return (
    <ul className="mb-4 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-slate-600">
          <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export const CRM_EFFECTS = (crm: "HubSpot" | "Pipedrive") => [
  `Chaque brief s'enrichit de ${crm} : fiche entreprise, deal en cours.`,
  "Après chaque rendez-vous, brief et compte-rendu sont ajoutés au deal ou au contact (à activer dans Notifications).",
  "Vos deals gagnés peuvent servir de références dans vos briefs.",
];

export const RECALL_EFFECTS = [
  "Un enregistreur rejoint automatiquement vos visios avec un prospect.",
  "Transcription, compte-rendu et scores arrivent dans Analyse rendez-vous quelques minutes après.",
];

export const SLACK_EFFECTS = [
  "Votre brief avant chaque rendez-vous et le compte-rendu après, en message privé.",
  "Le bilan hebdomadaire de l'équipe, si vous l'activez — réglable canal par canal dans Notifications.",
];
