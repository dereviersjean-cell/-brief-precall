"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, MapPin, X } from "lucide-react";

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
  // Chemin de navigation réel, affiché dans la bulle : sans lui, on comprend
  // ce qu'on regarde mais pas où le retrouver une fois la visite terminée.
  where: string;
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
    where: "Menu de gauche",
    title: "Trois sections, un cycle",
    body: "Le menu n'est pas une liste de fonctionnalités : c'est le déroulé d'un rendez-vous. On le prépare, on le débriefe, on en tire de quoi progresser. Pendant cette visite, les écrans sont remplis d'un exemple pour que vous voyiez le résultat — le bandeau orange vous le rappelle.",
  },
  {
    path: "/demo/dashboard",
    target: "overview-stats",
    phase: "Repères",
    kind: "contenu",
    where: "Performance › Vue d'ensemble",
    title: "Votre tableau de bord une fois alimenté",
    body: "Les rendez-vous de la semaine, le score moyen et sa progression, les derniers calls et les contacts actifs. Tout se remplit seul à mesure que vos rendez-vous ont lieu.",
  },
  {
    path: "/demo/feedback",
    target: "nav-feedback",
    phase: "Débriefer",
    kind: "section",
    where: "Analyse rendez-vous",
    title: "Après le rendez-vous",
    body: "Un assistant rejoint la visio et prend les notes à votre place. Chaque échange atterrit ici, transcrit et noté, sans que vous ayez rien saisi.",
  },
  {
    path: "/demo/feedback",
    target: "feedback-list",
    phase: "Débriefer",
    kind: "contenu",
    where: "Analyse rendez-vous",
    title: "Un compte-rendu par rendez-vous",
    body: "Chaque ligne porte sa note et son résumé. En l'ouvrant : le transcript complet, les points clés, les objections soulevées et vos réponses, les prochaines étapes, et un email de suivi prêt à relire. Chaque phrase renvoie au moment de la vidéo.",
  },
  {
    path: "/demo/scores",
    target: "demo-scores",
    phase: "Progresser",
    kind: "contenu",
    where: "Performance › Scores",
    title: "Scores — est-ce que je progresse ?",
    body: "La courbe semaine après semaine, et le détail par dimension de votre playbook. Ici le traitement des objections est à 2,4 : c'est le point faible, et les autres onglets vont dire pourquoi.",
  },
  {
    path: "/demo/analytics",
    target: "analytics-tiles",
    phase: "Progresser",
    kind: "contenu",
    where: "Performance › Analytics",
    title: "Analytics — comment je conduis un échange",
    body: "Temps de parole, monologues, questions posées, temps laissé au prospect. Comparé à la moyenne de l'équipe, jamais à une norme abstraite. Cliquez sur une tuile pour changer de métrique.",
  },
  {
    path: "/demo/objections",
    target: "demo-objections",
    phase: "Progresser",
    kind: "contenu",
    where: "Performance › Objections",
    title: "Objections — qu'est-ce qui me bloque",
    body: "Chaque objection rencontrée, son volume, et la part que vous traitez bien. Ici « équipe commerciale interne » revient 7 fois, dont 4 sans réponse — et 4 deals perdus. Dans votre compte, un clic ouvre le verbatim, votre réponse, et ce qu'il aurait fallu dire.",
  },
  {
    path: "/demo/playbook",
    target: "demo-playbook",
    phase: "Progresser",
    kind: "contenu",
    where: "Performance › Playbook",
    title: "Playbook — la grille qui vous note",
    body: "Les dimensions évaluées, leur poids et les questions qui les composent. Définie par votre manager. La consulter évite les mauvaises surprises : vous savez exactement sur quoi vous êtes attendu.",
  },
  {
    path: "/demo/dashboard",
    target: "nav-notifications",
    phase: "Progresser",
    kind: "commande",
    where: "Notifications",
    title: "Et surtout : Brief vient à vous",
    body: "Le plus souvent vous n'ouvrirez pas cette application. Le brief arrive dans votre boîte mail avant le rendez-vous, le compte-rendu dans votre CRM après. Ce réglage décide de ce que vous recevez et où.",
  },
  {
    path: "/demo/dashboard",
    target: "topbar-search",
    phase: "Repères",
    kind: "commande",
    where: "Barre du haut, ou ⌘K",
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
// Hauteur de repli, le temps du tout premier rendu. La hauteur RÉELLE est
// mesurée (voir `bubbleHeight`) : une constante devinée ne peut pas marcher,
// les textes vont de trois à huit lignes selon l'étape. La version précédente
// pariait sur 230 px pour une bulle qui en fait 450, jugeait qu'elle « tenait
// sous la cible », et le bouton « Suivant » se retrouvait sous l'écran.
const BUBBLE_FALLBACK_HEIGHT = 380;
const GAP = 16;
// Marge autour de la zone mise en avant. Trop serrée, la surbrillance semble
// couper l'élément ; c'est ce qui rendait le cadrage disgracieux.
const SPOTLIGHT_PADDING = 8;

// `side` : de quel côté de la bulle se trouve la cible. Sert à orienter la
// flèche — sans elle, rien ne relie visuellement le texte à la zone désignée,
// et on lit une explication sans savoir de quoi elle parle.
type Placement = {
  top: number;
  left: number;
  side: "left" | "right" | "top" | "bottom" | "none";
  // Vrai quand aucun côté ne pouvait accueillir la bulle sans la faire sortir
  // de l'écran : elle recouvre alors une partie du contenu, et on le sait.
  overlaps: boolean;
};

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
  // Hauteur réellement occupée par la bulle, mesurée après rendu. Sans elle
  // aucun placement n'est fiable : c'est la seule inconnue de l'équation.
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(0);

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

  // Suivi de la cible image par image (requestAnimationFrame), et non par
  // écouteurs `scroll`/`resize`.
  //
  // Deux raisons. D'abord un écouteur `scroll` ne voit PAS tous les cas : un
  // conteneur interne qui défile, une animation d'entrée, une image qui se
  // charge et pousse la mise en page — la surbrillance restait alors sur
  // l'ancienne position. Ensuite l'écouteur se déclenchait par rafales, et la
  // transition CSS de 200 ms faisait GLISSER l'anneau derrière le contenu à
  // chaque geste de molette : c'est le décalage constaté. Une lecture par
  // image, sans transition, colle exactement à l'élément.
  //
  // La boucle ne provoque un rendu que si le rectangle a réellement changé.
  useEffect(() => {
    if (!active) return;
    const step = STEPS[index];
    if (!step) return;

    // Repart d'un état « non mesuré » : sinon le rectangle de l'étape
    // précédente resterait affiché le temps de la mesure.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRect(undefined);

    let frame = 0;
    let signature = "";
    let scrolledIntoView = false;
    const startedAt = Date.now();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (!element) {
        // La cible peut ne pas être encore montée : après une navigation, ce
        // composant vit dans un layout partagé et tourne donc AVANT le contenu
        // de la nouvelle page. On patiente 2 s avant de conclure à l'absence,
        // sinon chaque étape suivant un changement de page serait dégradée.
        if (Date.now() - startedAt > 2000) setRect((current) => (current === undefined ? null : current));
        return;
      }

      const box = element.getBoundingClientRect();

      // Amener la cible dans l'écran, une seule fois par étape : la répéter à
      // chaque image empêcherait l'utilisateur de faire défiler lui-même.
      if (!scrolledIntoView) {
        scrolledIntoView = true;
        const fitsOnScreen = box.height < window.innerHeight - 2 * GAP;
        // `center` laisse de la place des DEUX côtés, donc un endroit où poser
        // la bulle sans recouvrir ce qu'elle décrit. Une cible plus haute que
        // l'écran ne peut pas être centrée : on l'aligne en haut.
        if (fitsOnScreen && (box.top < GAP || box.bottom > window.innerHeight - GAP)) {
          element.scrollIntoView({ block: "center", behavior: "smooth" });
        } else if (!fitsOnScreen && (box.top < 0 || box.top > window.innerHeight / 2)) {
          element.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }

      const next = `${box.top}|${box.left}|${box.width}|${box.height}`;
      if (next !== signature) {
        signature = next;
        setRect(box);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, index, pathname]);

  // Hauteur réelle de la bulle : elle change d'une étape à l'autre (textes de
  // longueurs différentes) et au redimensionnement de la fenêtre (retour à la
  // ligne). Un ResizeObserver est le seul moyen de la connaître sans la
  // deviner.
  // La bulle n'est rendue qu'une fois la cible mesurée : il faut donc rebrancher
  // l'observateur quand elle (re)paraît, d'où cette dépendance explicite.
  const bubbleMounted = rect !== undefined;
  useEffect(() => {
    const element = bubbleRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setBubbleHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, index, bubbleMounted]);

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
    // L'index avance TOUJOURS, y compris quand on change de page.
    //
    // Les pages /demo partagent un layout, et ce composant y est monté : Next
    // ne le remonte donc PAS lors d'une navigation entre elles. L'effet qui
    // lit `step` dans l'URL ne se rejouait jamais, l'index restait figé sur
    // l'étape précédente — la bulle décrivait Analytics alors qu'on était sur
    // Objections, et la cible cherchée était celle de l'ancienne page, d'où
    // deux secondes de tentatives avant d'abandonner.
    //
    // L'URL reste tenue à jour pour qu'un rechargement ou un lien direct
    // reprenne au bon endroit.
    setIndex((i) => i + 1);
    if (target.path !== pathname) {
      router.push(`${target.path}?tour=1&step=${index + 1}`);
    }
  }

  // Mesure en attente : on n'affiche rien plutôt que de conclure trop vite à
  // une cible absente (le contenu de la page peut encore être en train de se
  // monter après une navigation).
  if (rect === undefined) return null;

  // Cible réellement absente après les tentatives : on affiche la bulle seule,
  // sans surbrillance.
  //
  // L'étape était auparavant PASSÉE automatiquement, ce qui provoquait un
  // emballement : `next` change d'identité à chaque rendu, l'effet de saut se
  // rejouait donc en boucle, et comme une étape sur une autre page ne change
  // pas l'index mais déclenche une navigation, la visite défilait toute seule
  // à partir de la première cible manquante. Une bulle sans surbrillance est
  // dégradée mais reste sous le contrôle de l'utilisateur.
  const missingTarget = rect === null;

  // Cible occupant presque tout l'écran (un conteneur de page entier) :
  // l'entourer revient à « percer » toute la fenêtre, ce qui décale le
  // contenu et donne l'impression que l'écran est masqué. Dans ce cas on
  // renonce à la découpe et on affiche seulement la bulle.
  const coversScreen =
    missingTarget || rect.height > window.innerHeight * 0.7 || rect.width > window.innerWidth * 0.9;

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  // Hauteur mesurée tant qu'on l'a ; sinon repli, le temps d'une image.
  const height = bubbleHeight || BUBBLE_FALLBACK_HEIGHT;
  // La bulle ne dépasse JAMAIS l'écran : au pire elle défile en interne, mais
  // son pied — donc « Suivant » — reste toujours atteignable. C'est la
  // garantie qui manquait.
  const maxHeight = viewportHeight - 2 * GAP;
  const clampTop = (value: number) => Math.max(GAP, Math.min(value, Math.max(GAP, viewportHeight - height - GAP)));
  const clampLeft = (value: number) => Math.max(GAP, Math.min(value, Math.max(GAP, viewportWidth - BUBBLE_WIDTH - GAP)));

  const placement: Placement = (() => {
    // Cible pleine page : la bulle se pose en haut du contenu plutôt que
    // d'être calculée par rapport à un rectangle qui déborde de l'écran.
    if (coversScreen) {
      return {
        top: clampTop(96),
        left: clampLeft(missingTarget ? GAP + 240 : rect.left + GAP),
        side: "none",
        overlaps: false,
      };
    }

    // Espace libre de chaque côté de la cible. On choisit le premier côté qui
    // accueille la bulle ENTIÈRE — mesurée, pas supposée. L'ordre suit la
    // lecture : à droite, puis dessous, puis dessus, puis à gauche.
    const spaceRight = viewportWidth - rect.right - GAP;
    const spaceLeft = rect.left - GAP;
    const spaceBelow = viewportHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;

    if (spaceRight >= BUBBLE_WIDTH + GAP) {
      return { top: clampTop(rect.top), left: rect.right + GAP, side: "left", overlaps: false };
    }
    if (spaceBelow >= height + GAP) {
      return { top: rect.bottom + GAP, left: clampLeft(rect.left), side: "top", overlaps: false };
    }
    if (spaceAbove >= height + GAP) {
      return { top: rect.top - height - GAP, left: clampLeft(rect.left), side: "bottom", overlaps: false };
    }
    if (spaceLeft >= BUBBLE_WIDTH + GAP) {
      return { top: clampTop(rect.top), left: rect.left - BUBBLE_WIDTH - GAP, side: "right", overlaps: false };
    }

    // Aucun côté ne suffit. Plutôt que de recouvrir la cible — la seule chose
    // que la bulle ne doit jamais masquer — on se pose du côté le plus dégagé
    // et on le signale : la bulle devient translucide au survol pour laisser
    // relire ce qu'elle cache.
    const below = spaceBelow >= spaceAbove;
    return {
      top: below ? clampTop(rect.bottom + GAP) : clampTop(rect.top - height - GAP),
      left: clampLeft(rect.left),
      side: below ? "top" : "bottom",
      overlaps: true,
    };
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Fond assombri percé d'un trou sur la cible : une ombre portée
          démesurée évite d'avoir à découper quatre rectangles autour.
          AUCUNE transition : elle faisait glisser l'anneau derrière le contenu
          pendant le défilement, on voyait le cadre se décaler tout seul. */}
      {!coversScreen && (
        <div
          className="pointer-events-none absolute rounded-xl"
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
        ref={bubbleRef}
        className={`pointer-events-auto absolute flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl transition-opacity ${
          // Bulle contrainte de recouvrir du contenu : elle s'efface au survol
          // pour qu'on puisse relire ce qui est dessous, plutôt que d'obliger à
          // fermer la visite.
          placement.overlaps ? "hover:opacity-25" : ""
        }`}
        style={{
          top: placement.top,
          left: placement.left,
          maxHeight,
          // Premier rendu d'une étape : la hauteur n'est pas encore mesurée, le
          // placement serait faux. On la mesure invisible plutôt que de laisser
          // voir la bulle sauter d'une position à l'autre.
          opacity: bubbleHeight === 0 ? 0 : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flèche pointant vers la zone désignée. Un carré pivoté hérite du
            fond et de la bordure de la bulle, ce qui évite un SVG. Absente
            quand la cible couvre l'écran : elle ne désignerait rien. */}
        {placement.side !== "none" && (
          <span
            aria-hidden
            className="absolute z-10 h-3 w-3 rotate-45 border border-border bg-white"
            style={
              placement.side === "left"
                ? { left: -7, top: 26, borderRight: "none", borderTop: "none" }
                : placement.side === "right"
                ? { right: -7, top: 26, borderLeft: "none", borderBottom: "none" }
                : placement.side === "top"
                ? { top: -7, left: 26, borderRight: "none", borderBottom: "none" }
                : { bottom: -7, left: 26, borderLeft: "none", borderTop: "none" }
            }
          />
        )}

        <button
          type="button"
          onClick={close}
          aria-label="Fermer la visite"
          className="absolute right-3 top-3 z-10 text-slate-300 transition-colors hover:text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Seul le TEXTE défile ; le pied reste collé en bas. Sur un petit
            écran ou un texte long, la bulle ne peut plus reléguer « Suivant »
            hors de vue — c'est ce qui bloquait la visite à l'étape 6. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">
          <Header step={step} />
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 pb-5 pt-3">
          <Footer index={index} isLast={isLast} onClose={close} onNext={next} />
        </div>
      </div>
    </div>
  );
}

// En-tête et pied partagés par les deux formes d'étape (bulle ancrée sur un
// élément, panneau d'exemple centré) : même repérage et même navigation dans
// les deux cas, sinon on aurait l'impression de changer d'outil en cours de
// route.
function Header({ step }: { step: TourStep }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pr-5">
        <span className="rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[color:var(--violet)]">
          {step.phase}
        </span>
        <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
          {KIND_LABEL[step.kind]}
        </span>
      </div>

      {/* Où retrouver cet écran une fois la visite finie. Sans ce repère, on
          comprend ce qu'on regarde sans savoir y revenir. */}
      <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">
        <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
        {step.where}
      </p>

      <h3 className="mt-2.5 pr-5 text-[15px] font-semibold text-slate-900">{step.title}</h3>
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
      <div className="flex items-center gap-1">
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
