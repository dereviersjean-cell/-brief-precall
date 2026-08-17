"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

// Visite guidée de l'interface, par bulles ancrées sur les vrais éléments.
//
// Complète /bienvenue (qui explique le produit) et l'onboarding (qui explique
// chaque question) : ici on situe la navigation. Trois registres différents,
// c'est voulu — savoir ce que fait Brief ne dit pas où cliquer.
//
// Écueil connu de ce format : au premier jour, les écrans pointés sont vides.
// Les textes disent donc ce qui VA s'y trouver, jamais « voici vos calls » sur
// une liste vide.
//
// Ancrée sur des `data-tour` explicites plutôt que sur des sélecteurs de
// classe ou de href : un attribut dédié signale à qui édite ces composants
// qu'ils sont référencés ailleurs.

type TourStep = { target: string; title: string; body: string };

const STEPS: TourStep[] = [
  {
    target: "nav-brief",
    title: "Vos briefs de préparation",
    body: "Avant chaque rendez-vous, Brief prépare ici un dossier sur le prospect : son activité, son actualité, l'historique de vos échanges. Vous les recevrez aussi par email, sans avoir à venir les chercher.",
  },
  {
    target: "nav-feedback",
    title: "Vos rendez-vous analysés",
    body: "Après chaque visio, le compte-rendu arrive ici : points clés, objections soulevées, prochaines étapes, et un email de suivi prêt à relire. Vous pouvez réécouter n'importe quel passage.",
  },
  {
    target: "nav-performance",
    title: "Votre progression",
    body: "Vos scores par rendez-vous, les objections qui reviennent le plus, la façon dont vous les traitez, et ce qu'il aurait fallu répondre. C'est ici que vous verrez ce qui vous fait gagner ou perdre.",
  },
  {
    target: "topbar-search",
    title: "Retrouver un contact ou un call",
    body: "Tapez un nom de société ou un email pour retrouver un rendez-vous. Le raccourci ⌘K fonctionne depuis n'importe quelle page.",
  },
];

const STORAGE_KEY = "brief_tour_seen_v1";
const BUBBLE_WIDTH = 320;
const GAP = 12;

type Placement = { top: number; left: number };

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Ne démarre JAMAIS toute seule : uniquement sur ?tour=1, déclenché depuis
  // /bienvenue. Un tutoriel qui s'ouvre sans prévenir chez un utilisateur
  // installé depuis six mois est une nuisance, pas une aide.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") !== "1") return;
    // La sidebar est un tiroir replié en mobile : les cibles y sont
    // invisibles, et pointer une bulle vers du vide est pire que ne rien
    // montrer.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    // Lecture de l'URL et du viewport : indisponibles au rendu serveur, donc
    // impossibles dans un initialiseur useState sans provoquer un écart
    // d'hydratation. Un effet au montage est ici l'outil prévu, et il ne
    // s'exécute qu'une fois.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
  }, []);

  const measure = useCallback(() => {
    const step = STEPS[index];
    if (!step) return;
    const element = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(element ? element.getBoundingClientRect() : null);
  }, [index]);

  useEffect(() => {
    if (!active) return;
    // Mesure du DOM après peinture : par nature impossible pendant le rendu,
    // c'est le cas d'usage canonique d'un effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  const close = useCallback(() => {
    setActive(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Navigation privée ou stockage refusé : sans conséquence, la visite ne
      // se relance de toute façon que sur ?tour=1.
    }
    // Retire le paramètre pour qu'un rechargement ne relance pas la visite.
    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, close]);

  if (!active) return null;

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  function next() {
    if (isLast) close();
    else setIndex((i) => i + 1);
  }

  // Cible introuvable (élément réservé à un rôle, page sans sidebar) : on
  // passe l'étape plutôt que d'afficher une bulle orpheline.
  if (!rect) {
    if (isLast) return null;
    return <SkipEffect onSkip={() => setIndex((i) => i + 1)} />;
  }

  const placement: Placement = (() => {
    const below = rect.bottom + GAP;
    const fitsBelow = below + 170 < window.innerHeight;
    const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - BUBBLE_WIDTH - GAP);
    return fitsBelow
      ? { top: below, left }
      : { top: Math.max(GAP, rect.top - 170 - GAP), left };
  })();

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Fond assombri percé d'un trou sur la cible : une ombre portée
          démesurée évite d'avoir à découper quatre rectangles autour. */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-white/80 transition-all duration-200"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
        }}
      />
      {/* Capte les clics hors bulle pour fermer, sans bloquer la cible. */}
      <div className="absolute inset-0" onClick={close} />

      <div
        className="absolute w-[320px] rounded-2xl border border-border bg-white p-5 shadow-xl"
        style={{ top: placement.top, left: placement.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer la visite"
          className="absolute right-3 top-3 text-slate-300 transition-colors hover:text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--violet)]">
          {index + 1} sur {STEPS.length}
        </p>
        <h3 className="mt-1 pr-5 text-[15px] font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-[12.5px] text-slate-400 hover:text-slate-600">
            Passer la visite
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg brand-gradient px-3 text-[12.5px] font-medium text-white transition-all hover:brightness-110"
          >
            {isLast ? "Terminer" : "Suivant"}
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Avance d'une étape sans rendu : un effet plutôt qu'un setState pendant le
// rendu, qui provoquerait un avertissement React.
function SkipEffect({ onSkip }: { onSkip: () => void }) {
  useEffect(() => {
    onSkip();
  }, [onSkip]);
  return null;
}
