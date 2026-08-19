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
    title: "Brief suit le cycle d'un rendez-vous",
    body: "Les trois sections ne sont pas un menu, ce sont trois moments qui s'enchaînent : préparer le rendez-vous, le débriefer, en tirer de quoi progresser. Chacune alimente la suivante. On commence par le début.",
  },
  {
    path: "/brief",
    target: "brief-content",
    title: "1. Préparer — ce qui vous attend avant le rendez-vous",
    body: "Dès que votre agenda est connecté, vos prochains rendez-vous apparaissent ici avec leur dossier : l'activité de l'entreprise, son actualité, ses données légales, l'historique de vos échanges. Vous n'avez rien à demander — le brief se prépare tout seul.",
  },
  {
    path: "/feedback",
    target: "feedback-content",
    title: "2. Débriefer — ce qui arrive après, sans rien faire",
    body: "Un assistant rejoint la visio et prend des notes à votre place. Chaque rendez-vous arrive ici transcrit et noté : points clés, objections soulevées, prochaines étapes, et un email de suivi prêt à relire. Vous pouvez réécouter n'importe quel passage pour vérifier ce qui s'est dit.",
  },
  {
    path: "/dashboard",
    target: "performance-tabs",
    title: "3. Progresser — ce que les rendez-vous accumulés révèlent",
    body: "Un rendez-vous isolé ne dit rien ; dix rendez-vous disent tout. Scores suit votre progression, Analytics votre façon de conduire un échange, Objections ce qui vous bloque et comment vous y répondez, Playbook la grille sur laquelle vous êtes noté.",
  },
  {
    path: "/dashboard",
    target: "nav-notifications",
    title: "Et le plus souvent, vous ne venez même pas ici",
    body: "Brief pousse ses résultats là où vous travaillez déjà : le brief dans votre boîte mail avant le rendez-vous, le compte-rendu dans votre CRM après. Vous choisissez ici ce que vous voulez recevoir et où. L'application n'est qu'un endroit où revenir quand vous voulez creuser.",
  },
  {
    path: "/dashboard",
    target: "topbar-search",
    title: "Retrouver quelque chose",
    body: "Un nom de société, un email, et vous retombez sur le contact ou le rendez-vous. Le raccourci ⌘K fonctionne depuis n'importe quelle page.",
  },
  {
    path: "/dashboard",
    target: "nav-performance",
    title: "La boucle se referme",
    body: "Chaque rendez-vous nourrit les suivants : ce que vous avez appris sur une objection sert au prochain brief, et vos statistiques se précisent à mesure. Il ne vous reste qu'à connecter votre agenda pour lancer la machine.",
  },
];

const STORAGE_KEY = "brief_tour_seen_v1";
const BUBBLE_WIDTH = 340;
// Hauteur retenue pour décider si la bulle tient sous la cible. Généreuse
// exprès : sous-estimer ferait sortir la bulle de l'écran sur les textes longs.
const BUBBLE_HEIGHT = 230;
const GAP = 16;
// Marge autour de la zone mise en avant. Trop serrée, la surbrillance semble
// couper l'élément ; c'est ce qui rendait le cadrage disgracieux.
const SPOTLIGHT_PADDING = 8;

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
    if (!element) {
      setRect(null);
      return;
    }
    // Amène la cible dans l'écran avant de mesurer : sans ça, une étape
    // portant sur un élément sous la ligne de flottaison montrait une bulle
    // ancrée hors du champ visible.
    const box = element.getBoundingClientRect();
    if (box.top < GAP || box.bottom > window.innerHeight - GAP) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    setRect(element.getBoundingClientRect());
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
    const maxLeft = window.innerWidth - BUBBLE_WIDTH - GAP;

    // Cible étroite (une entrée de menu) : la bulle se pose à sa droite, ce
    // qui la laisse entièrement visible. Cible large (une carte pleine
    // largeur) : à droite il n'y a plus de place, on passe dessous.
    const fitsRight = rect.right + GAP + BUBBLE_WIDTH < window.innerWidth;
    if (fitsRight) {
      const top = Math.min(
        Math.max(GAP, rect.top),
        Math.max(GAP, window.innerHeight - BUBBLE_HEIGHT - GAP)
      );
      return { top, left: rect.right + GAP };
    }

    const left = Math.min(Math.max(GAP, rect.left), Math.max(GAP, maxLeft));
    const fitsBelow = rect.bottom + GAP + BUBBLE_HEIGHT < window.innerHeight;
    return fitsBelow
      ? { top: rect.bottom + GAP, left }
      : { top: Math.max(GAP, rect.top - BUBBLE_HEIGHT - GAP), left };
  })();

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Fond assombri percé d'un trou sur la cible : une ombre portée
          démesurée évite d'avoir à découper quatre rectangles autour. */}
      <div
        className="pointer-events-none absolute rounded-xl ring-2 ring-white/80 transition-all duration-200"
        style={{
          top: rect.top - SPOTLIGHT_PADDING,
          left: rect.left - SPOTLIGHT_PADDING,
          width: rect.width + SPOTLIGHT_PADDING * 2,
          height: rect.height + SPOTLIGHT_PADDING * 2,
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
        }}
      />
      {/* Capte les clics hors bulle pour fermer, sans bloquer la cible. */}
      <div className="absolute inset-0" onClick={close} />

      <div
        className="absolute w-[340px] rounded-2xl border border-border bg-white p-5 shadow-2xl"
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
