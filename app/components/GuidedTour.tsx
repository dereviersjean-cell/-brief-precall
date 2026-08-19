"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
//
// ⚠ La visite traverse plusieurs pages, et chaque page a son propre layout
// dans Next : ce composant doit être monté dans le layout de CHACUNE des
// pages listées dans STEPS.path, faute de quoi la bulle disparaît en y
// arrivant et la visite s'arrête sans rien dire. Montée aujourd'hui dans
// app/dashboard/layout.tsx, app/brief/layout.tsx et app/feedback/layout.tsx.
// Toute nouvelle valeur de `path` impose d'ajouter le montage correspondant.

// `path` : page sur laquelle l'étape doit être jouée. La visite y navigue
// d'elle-même — pointer uniquement la sidebar ne montrait que la navigation,
// jamais ce que chaque section contient réellement.
type TourStep = { target: string; title: string; body: string; path: string };

const STEPS: TourStep[] = [
  {
    path: "/dashboard",
    target: "nav-brief",
    title: "Trois sections, trois moments",
    body: "La navigation suit le cycle d'un rendez-vous : le préparer, le débriefer, progresser. On commence par la préparation.",
  },
  {
    path: "/brief",
    target: "brief-content",
    title: "Avant le rendez-vous",
    body: "Vos prochains rendez-vous s'affichent ici dès que votre agenda est connecté, chacun avec son brief : l'activité de l'entreprise, son actualité, l'historique de vos échanges. Vous les recevez aussi par email.",
  },
  {
    path: "/feedback",
    target: "feedback-content",
    title: "Après le rendez-vous",
    body: "Chaque visio enregistrée arrive ici, transcrite et notée : points clés, objections soulevées, prochaines étapes, et un email de suivi prêt à relire. Vous pouvez réécouter n'importe quel passage.",
  },
  {
    path: "/dashboard",
    target: "performance-tabs",
    title: "Ce que vous en tirez",
    body: "Performance se découpe en thèmes : vos scores, la façon dont vous conduisez vos rendez-vous, les objections qui reviennent, et la grille sur laquelle vous êtes noté.",
  },
  {
    path: "/dashboard",
    target: "topbar-search",
    title: "Retrouver quelque chose",
    body: "Tapez un nom de société ou un email pour retrouver un contact ou un rendez-vous. Le raccourci ⌘K fonctionne depuis n'importe quelle page.",
  },
];

const STORAGE_KEY = "brief_tour_seen_v1";
const BUBBLE_WIDTH = 320;
const GAP = 12;

type Placement = { top: number; left: number };

export default function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  // `undefined` = pas encore mesuré, `null` = mesuré et cible absente.
  // Confondre les deux faisait sauter la première étape à chaque fois : au
  // premier rendu la mesure n'a pas encore eu lieu, et l'étape était traitée
  // comme introuvable.
  const [rect, setRect] = useState<DOMRect | null | undefined>(undefined);

  // Ne démarre JAMAIS toute seule : uniquement sur ?tour=1, déclenché depuis
  // /bienvenue. Un tutoriel qui s'ouvre sans prévenir chez un utilisateur
  // installé depuis six mois est une nuisance, pas une aide.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") !== "1") return;
    const requested = Number(params.get("step"));
    // Reprise de la position après une navigation entre pages : l'URL est le
    // seul état qui survive au changement de page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isInteger(requested) && requested >= 0 && requested < STEPS.length) setIndex(requested);
    // La sidebar est un tiroir replié en mobile : les cibles y sont
    // invisibles, et pointer une bulle vers du vide est pire que ne rien
    // montrer.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    // Lecture de l'URL et du viewport : indisponibles au rendu serveur, donc
    // impossibles dans un initialiseur useState sans provoquer un écart
    // d'hydratation. Un effet au montage est ici l'outil prévu.
    setActive(true);
  }, []);

  const measure = useCallback(() => {
    const step = STEPS[index];
    if (!step) return;
    const element = document.querySelector(`[data-tour="${step.target}"]`);
    setRect(element ? element.getBoundingClientRect() : null);
  }, [index]);

  // Une nouvelle étape repart d'un état « non mesuré », sinon le rectangle de
  // l'étape précédente resterait affiché le temps de la mesure.
  useEffect(() => {
    // Réinitialisation en réaction à un changement d'étape ou de page : c'est
    // précisément ce qu'un effet doit faire, la valeur ne peut pas être
    // dérivée au rendu puisqu'elle vient d'une mesure du DOM.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRect(undefined);
  }, [index, pathname]);

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
    if (isLast) {
      close();
      return;
    }
    const target = STEPS[index + 1];
    // Étape sur une autre page : on y navigue en emportant la position dans
    // l'URL, seul état qui survive à un changement de page.
    if (target.path !== pathname) {
      router.push(`${target.path}?tour=1&step=${index + 1}`);
      return;
    }
    setIndex((i) => i + 1);
  }

  // Mesure en attente : on n'affiche rien plutôt que de conclure trop vite à
  // une cible absente (le contenu de la page peut encore être en train de se
  // monter après une navigation).
  if (rect === undefined) return null;

  // Cible réellement absente (élément réservé à un rôle, page inattendue) :
  // on passe l'étape plutôt que d'afficher une bulle orpheline.
  if (rect === null) {
    if (isLast) return null;
    return <SkipEffect onSkip={next} />;
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
