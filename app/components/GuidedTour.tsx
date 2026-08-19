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
// `phase` : où l'on se trouve dans le cycle, affiché en permanence pour qu'on
// ne perde jamais le fil. `kind` distingue « voici une section » de « voici ce
// qu'elle contient » et de « voici à quoi sert ce bouton » — sans cette
// distinction, toutes les bulles se ressemblaient et on ne savait pas si on
// regardait une zone ou une commande.
type TourStep = {
  path: string;
  target: string;
  phase: "Repères" | "Préparer" | "Débriefer" | "Progresser";
  kind: "section" | "contenu" | "commande";
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    path: "/demo/dashboard",
    target: "nav-brief",
    phase: "Repères",
    kind: "section",
    title: "Trois sections, un cycle",
    body: "Le menu n'est pas une liste de fonctionnalités : c'est le déroulé d'un rendez-vous. On le prépare, on le débriefe, on en tire de quoi progresser. Pendant cette visite, les écrans sont remplis d'un exemple pour que vous voyiez le résultat — le bandeau orange vous le rappelle.",
  },
  {
    path: "/demo/dashboard",
    target: "demo-overview",
    phase: "Repères",
    kind: "contenu",
    title: "Votre tableau de bord une fois alimenté",
    body: "Les rendez-vous de la semaine, le score moyen et sa progression, les derniers calls et les contacts actifs. Tout se remplit seul à mesure que vos rendez-vous ont lieu.",
  },
  {
    path: "/demo/feedback",
    target: "nav-feedback",
    phase: "Débriefer",
    kind: "section",
    title: "Après le rendez-vous",
    body: "Un assistant rejoint la visio et prend les notes à votre place. Chaque échange atterrit ici, transcrit et noté, sans que vous ayez rien saisi.",
  },
  {
    path: "/demo/feedback",
    target: "demo-feedback",
    phase: "Débriefer",
    kind: "contenu",
    title: "Un compte-rendu par rendez-vous",
    body: "Chaque ligne porte sa note et son résumé. En l'ouvrant : le transcript complet, les points clés, les objections soulevées et vos réponses, les prochaines étapes, et un email de suivi prêt à relire. Chaque phrase renvoie au moment de la vidéo.",
  },
  {
    path: "/demo/scores",
    target: "demo-scores",
    phase: "Progresser",
    kind: "contenu",
    title: "Scores — est-ce que je progresse ?",
    body: "La courbe semaine après semaine, et le détail par dimension de votre playbook. Ici le traitement des objections est à 2,4 : c'est le point faible, et les autres onglets vont dire pourquoi.",
  },
  {
    path: "/demo/analytics",
    target: "demo-analytics",
    phase: "Progresser",
    kind: "contenu",
    title: "Analytics — comment je conduis un échange",
    body: "Temps de parole, monologues, questions posées, temps laissé au prospect. Comparé à la moyenne de l'équipe, jamais à une norme abstraite. Cliquez sur une tuile pour changer de métrique.",
  },
  {
    path: "/demo/objections",
    target: "demo-objections",
    phase: "Progresser",
    kind: "contenu",
    title: "Objections — qu'est-ce qui me bloque",
    body: "Chaque objection rencontrée, son volume, et la part que vous traitez bien. Ici « équipe commerciale interne » revient 7 fois, dont 4 sans réponse — et 4 deals perdus. Dans votre compte, un clic ouvre le verbatim, votre réponse, et ce qu'il aurait fallu dire.",
  },
  {
    path: "/demo/playbook",
    target: "demo-playbook",
    phase: "Progresser",
    kind: "contenu",
    title: "Playbook — la grille qui vous note",
    body: "Les dimensions évaluées, leur poids et les questions qui les composent. Définie par votre manager. La consulter évite les mauvaises surprises : vous savez exactement sur quoi vous êtes attendu.",
  },
  {
    path: "/demo/dashboard",
    target: "nav-notifications",
    phase: "Progresser",
    kind: "commande",
    title: "Et surtout : Brief vient à vous",
    body: "Le plus souvent vous n'ouvrirez pas cette application. Le brief arrive dans votre boîte mail avant le rendez-vous, le compte-rendu dans votre CRM après. Ce réglage décide de ce que vous recevez et où.",
  },
  {
    path: "/demo/dashboard",
    target: "topbar-search",
    phase: "Repères",
    kind: "commande",
    title: "Retrouver un contact ou un rendez-vous",
    body: "Un nom de société, un email. Le raccourci ⌘K fonctionne partout. La visite est terminée — vous revenez maintenant sur vos propres données, encore vides pour l'instant.",
  },
];

// Dit explicitement ce qu'on regarde : une section du menu, une zone de
// contenu, ou une commande. Sans ça toutes les bulles se ressemblaient.
const KIND_LABEL: Record<TourStep["kind"], string> = {
  section: "Section",
  contenu: "Ce que contient cette zone",
  commande: "À quoi sert cette commande",
};

const STORAGE_KEY = "brief_tour_seen_v1";
const BUBBLE_WIDTH = 340;
// Hauteur retenue pour décider si la bulle tient sous la cible. Généreuse
// exprès : sous-estimer ferait sortir la bulle de l'écran sur les textes longs.
const BUBBLE_HEIGHT = 230;
const GAP = 16;
// Marge autour de la zone mise en avant. Trop serrée, la surbrillance semble
// couper l'élément ; c'est ce qui rendait le cadrage disgracieux.
const SPOTLIGHT_PADDING = 8;

// `side` : de quel côté de la bulle se trouve la cible. Sert à orienter la
// flèche — sans elle, rien ne relie visuellement le texte à la zone désignée,
// et on lit une explication sans savoir de quoi elle parle.
type Placement = { top: number; left: number; side: "left" | "top" | "bottom" | "none" };

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

  // Mesure la cible, en RÉESSAYANT tant qu'elle n'existe pas encore.
  //
  // Sans cette patience, chaque étape suivant une navigation était sautée : le
  // composant se remonte avant que le contenu de la nouvelle page ne soit dans
  // le DOM, la cible était donc introuvable et l'étape considérée comme
  // inexistante. En cascade, la visite se vidait de la moitié de ses étapes.
  const measureInto = useCallback(
    (target: string, onMissing: () => void) => {
      const element = document.querySelector(`[data-tour="${target}"]`);
      if (!element) {
        onMissing();
        return;
      }
      // Amène la cible dans l'écran avant de mesurer : sans ça, une étape
      // portant sur un élément sous la ligne de flottaison montrait une bulle
      // ancrée hors du champ visible.
      const box = element.getBoundingClientRect();
      // Centrer un élément plus haut que l'écran n'a pas de sens et provoque
      // un saut de défilement déroutant.
      const fitsOnScreen = box.height < window.innerHeight - 2 * GAP;
      if (fitsOnScreen && (box.top < GAP || box.bottom > window.innerHeight - GAP)) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setRect(element.getBoundingClientRect());
    },
    []
  );

  useEffect(() => {
    if (!active) return;
    const step = STEPS[index];
    if (!step) return;

    // Repart d'un état « non mesuré » : sinon le rectangle de l'étape
    // précédente resterait affiché le temps de la mesure. Valeur issue du DOM,
    // donc impossible à dériver au rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRect(undefined);

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // 20 tentatives à 100 ms = 2 s. Au-delà, la cible est réellement absente
    // (élément réservé à un rôle, page inattendue) et l'étape est passée.
    const attempt = () => {
      if (cancelled) return;
      measureInto(step.target, () => {
        attempts += 1;
        if (attempts >= 20) {
          setRect(null);
          return;
        }
        timer = setTimeout(attempt, 100);
      });
    };
    attempt();

    const remeasure = () => measureInto(step.target, () => {});
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [active, index, pathname, measureInto]);

  const close = useCallback(() => {
    setActive(false);
    // La visite se déroule sur les routes /demo : la quitter doit ramener sur
    // les vraies données, sinon on reste devant un exemple sans s'en rendre
    // compte une fois le bandeau oublié.
    if (window.location.pathname.startsWith("/demo")) {
      window.location.href = "/dashboard";
      return;
    }
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

  // Cible occupant presque tout l'écran (un conteneur de page entier) :
  // l'entourer revient à « percer » toute la fenêtre, ce qui décale le
  // contenu et donne l'impression que l'écran est masqué. Dans ce cas on
  // renonce à la découpe et on affiche seulement la bulle.
  const coversScreen = rect.height > window.innerHeight * 0.7 || rect.width > window.innerWidth * 0.9;

  const placement: Placement = (() => {
    // Cible pleine page : la bulle se pose en haut à gauche du contenu plutôt
    // que d'être calculée par rapport à un rectangle qui déborde de l'écran.
    if (coversScreen) {
      return { top: 96, left: Math.max(GAP, rect.left + GAP), side: "none" };
    }

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
      return { top, left: rect.right + GAP, side: "left" };
    }

    const left = Math.min(Math.max(GAP, rect.left), Math.max(GAP, maxLeft));
    const fitsBelow = rect.bottom + GAP + BUBBLE_HEIGHT < window.innerHeight;
    return fitsBelow
      ? { top: rect.bottom + GAP, left, side: "top" }
      : { top: Math.max(GAP, rect.top - BUBBLE_HEIGHT - GAP), left, side: "bottom" };
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Fond assombri percé d'un trou sur la cible : une ombre portée
          démesurée évite d'avoir à découper quatre rectangles autour. */}
      {!coversScreen && (
      <div
        className="pointer-events-none absolute rounded-xl transition-all duration-200"
        style={{
          top: rect.top - SPOTLIGHT_PADDING,
          left: rect.left - SPOTLIGHT_PADDING,
          width: rect.width + SPOTLIGHT_PADDING * 2,
          height: rect.height + SPOTLIGHT_PADDING * 2,
          // Voile volontairement léger : l'écran autour doit rester lisible,
          // sinon on met en avant un élément sans qu'on puisse le situer.
          // L'anneau, lui, est franc — c'est lui qui désigne, pas l'obscurité.
          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.38), 0 0 0 3px var(--violet)",
        }}
      />
      )}
      {/* Aucun calque bloquant : il avalait la molette et le tactile, on se
          retrouvait figé sur l'écran sans pouvoir faire défiler. La page reste
          entièrement utilisable pendant la visite — c'est d'ailleurs préférable,
          on peut regarder ce que la bulle décrit. */}

      <div
        className="pointer-events-auto absolute w-[340px] rounded-2xl border border-border bg-white p-5 shadow-2xl"
        style={{ top: placement.top, left: placement.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flèche pointant vers la zone désignée. Un carré pivoté hérite du
            fond et de la bordure de la bulle, ce qui évite un SVG. Absente
            quand la cible couvre l'écran : elle ne désignerait rien. */}
        {placement.side !== "none" && (
        <span
          aria-hidden
          className="absolute h-3 w-3 rotate-45 border border-border bg-white"
          style={
            placement.side === "left"
              ? { left: -7, top: 26, borderRight: "none", borderTop: "none" }
              : placement.side === "top"
              ? { top: -7, left: 26, borderRight: "none", borderBottom: "none" }
              : { bottom: -7, left: 26, borderLeft: "none", borderTop: "none" }
          }
        />
        )}
        <Header step={step} onClose={close} />
        <Footer index={index} isLast={isLast} onClose={close} onNext={next} />
      </div>
    </div>
  );
}

// En-tête et pied partagés par les deux formes d'étape (bulle ancrée sur un
// élément, panneau d'exemple centré) : même repérage et même navigation dans
// les deux cas, sinon on aurait l'impression de changer d'outil en cours de
// route.
function Header({ step, onClose }: { step: TourStep; onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la visite"
        className="absolute right-3 top-3 text-slate-300 transition-colors hover:text-slate-500"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-center gap-2 pr-5">
        <span className="rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--violet)]">
          {step.phase}
        </span>
        <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
          {KIND_LABEL[step.kind]}
        </span>
      </div>

      <h3 className="mt-2 pr-5 text-[15px] font-semibold text-slate-900">{step.title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{step.body}</p>
    </>
  );
}

function Footer({
  index,
  isLast,
  onClose,
  onNext,
}: {
  index: number;
  isLast: boolean;
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {/* Progression segmentée : un « 3 sur 15 » ne dit pas s'il reste
          beaucoup, une barre le montre d'un coup d'œil. */}
      <div className="mt-4 flex items-center gap-1">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= index ? "bg-[color:var(--violet)]" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        Étape {index + 1} sur {STEPS.length}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="text-[12.5px] text-slate-400 hover:text-slate-600">
          Passer la visite
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg brand-gradient px-3 text-[12.5px] font-medium text-white transition-all hover:brightness-110"
        >
          {isLast ? "Terminer" : "Suivant"}
          {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
        </button>
      </div>
    </>
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
