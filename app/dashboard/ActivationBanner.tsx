import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import type { ActivationState } from "@/lib/db";

// Rappel compact de l'activation, en tête du tableau de bord.
//
// La page /bienvenue n'est vue qu'une fois, à la sortie de l'onboarding — or
// on ne branche jamais tout le premier jour. Sans ce rappel, un compte à
// moitié configuré reste à moitié configuré, et l'utilisateur conclut que le
// produit ne fait rien plutôt qu'il lui manque une connexion.
//
// Disparaît dès que tout est fait : un bandeau permanent devient du décor.

// Toutes à l'infinitif : elles s'enchaînent après « Il reste à », et mélanger
// un groupe nominal (« votre premier rendez-vous analysé ») dans une liste de
// verbes produisait une phrase bancale.
const LABELS: Record<ActivationState["steps"][number]["key"], string> = {
  profil: "décrire ce que vous vendez",
  agenda: "connecter votre agenda",
  playbook: "définir votre playbook",
  "premier-call": "tenir un premier rendez-vous",
};

// Énumération française : « a, b et c » — pas « a, b, c ».
function enumerate(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export default function ActivationBanner({ activation }: { activation: ActivationState }) {
  const remaining = activation.steps.filter((s) => !s.done);
  if (activation.total === 0 || remaining.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--violet)]" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-slate-900">
              Démarrage : {activation.completed} étape{activation.completed > 1 ? "s" : ""} sur {activation.total}
            </p>
            <p className="mt-0.5 text-[12.5px] text-slate-600">
              Il reste à {enumerate(remaining.map((s) => LABELS[s.key]))}.
            </p>
          </div>
        </div>
        <Link
          href="/bienvenue"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[12.5px] font-medium text-[color:var(--violet)] shadow-[var(--shadow-xs)] transition-colors hover:bg-white/80"
        >
          Terminer <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
