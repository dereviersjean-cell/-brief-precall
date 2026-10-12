"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Haut de page « à la Apple » : sur grand écran, la section est plus haute que
// l'écran et son contenu reste épinglé. Le défilement ne fait pas descendre la
// page, il fait jouer le produit (animations liées au défilement, CSS natif,
// bloc « Haut de page épinglé » de globals.css) :
//   1. le titre s'efface en remontant ;
//   2. le brief se soulève jusqu'à être lu en entier, ajusté à l'écran ;
//   3. il se replie — ne restent que l'accroche, la vue d'ensemble et le
//      contact — et se pose EXACTEMENT à l'emplacement de l'objet de l'étape
//      « Préparer » de la séquence (Journey), pendant que l'introduction de la
//      méthode (`bridge`) apparaît à gauche ;
//   4. relais : la séquence, qui chevauche la fin du haut de page, devient
//      visible à cet emplacement pendant que le brief s'efface. Pas de coupure :
//      la frise et l'objet sont déjà en place quand le haut de page se libère.
// Ce composant ne fait que MESURER, en coordonnées non transformées :
// position et taille de la carte du brief, place disponible, emplacement de
// l'objet de la séquence. Rien n'est deviné. Sous 1024 px, sans timelines de
// défilement ou en mouvement réduit, rien n'est épinglé.
function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

export function HeroStage({ copy, sheet, bridge }: { copy: ReactNode; sheet: ReactNode; bridge: ReactNode }) {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    const sheetEl = sheetRef.current;
    const card = sheetEl?.querySelector<HTMLElement>("[data-hero-card]");
    if (!track || !pin || !sheetEl || !card) return;

    // La carte rapetisse pendant le repli : on retient sa hauteur DÉPLIÉE,
    // sinon l'échelle se recalculerait en plein défilement. Remise à zéro si
    // la largeur change.
    let fullHeight = 0;
    let lastWidth = 0;

    const measure = () => {
      const width = pin.clientWidth;
      if (width !== lastWidth) {
        lastWidth = width;
        fullHeight = 0;
      }
      fullHeight = Math.max(fullHeight, card.offsetHeight);
      const pinTop = parseFloat(getComputedStyle(pin).top) || 64;
      const { x: cx, y: cy } = offsetWithin(card, sheetEl);
      const cw = card.offsetWidth;
      const sy = sheetEl.offsetTop;

      // Temps 2 : carte centrée, son haut à 20 px sous la barre.
      const fit = Math.min(0.94, (pin.clientHeight - 40) / fullHeight);
      const tx = width / 2 - fit * (cx + cw / 2);
      const ty = 20 - sy - cy * fit;

      // Temps 3 : l'emplacement de l'objet de l'étape « Préparer », tel qu'il
      // sera quand la scène collante de la séquence sera en place.
      const stagePin = document.querySelector<HTMLElement>("[data-journey-pin]");
      const stageItem = document.querySelector<HTMLElement>("[data-journey-stage] > *");
      let dx = tx;
      let dy = ty;
      let dock = fit;
      if (stagePin && stageItem) {
        const pinBox = stagePin.getBoundingClientRect();
        const itemBox = stageItem.getBoundingClientRect();
        const stagePinTop = parseFloat(getComputedStyle(stagePin).top) || 64;
        const targetTop = stagePinTop + (itemBox.top - pinBox.top);
        dock = itemBox.width / cw;
        dx = itemBox.left - pin.getBoundingClientRect().left - cx * dock;
        dy = targetTop - pinTop - sy - cy * dock;
      }

      const set = (k: string, v: string) => track.style.setProperty(k, v);
      set("--hero-tx", `${tx}px`);
      set("--hero-ty", `${ty}px`);
      set("--hero-fit", fit.toFixed(4));
      set("--hero-dx", `${dx}px`);
      set("--hero-dy", `${dy}px`);
      set("--hero-dock", dock.toFixed(4));
    };

    measure();
    // La scène de la séquence ajuste son échelle après son propre premier
    // rendu : on remesure une fois qu'elle s'est posée, et à chaque
    // redimensionnement.
    const late = window.setTimeout(measure, 400);
    const ro = new ResizeObserver(measure);
    ro.observe(pin);
    ro.observe(card);
    const stage = document.querySelector<HTMLElement>("[data-journey-stage]");
    if (stage) ro.observe(stage);
    return () => {
      window.clearTimeout(late);
      ro.disconnect();
    };
  }, []);

  return (
    <section ref={trackRef} className="land-hero-track">
      <div ref={pinRef} className="land-hero-pin relative">
        <div className="land-hero-copy">{copy}</div>
        <div ref={sheetRef} className="land-hero-sheet relative">
          {sheet}
        </div>
        {/* Colonne de gauche de la séquence, alignée sur sa grille. */}
        <div className="land-hero-bridge pointer-events-none absolute inset-0">
          <div className="mx-auto grid h-full max-w-6xl grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-16 px-6">
            <div className="pointer-events-auto">{bridge}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
