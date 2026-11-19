"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Entrée en scène au défilement, une seule fois. Le conteneur porte
// `data-inview` : "false" tant qu'il est sous l'écran, "true" dès qu'il y
// entre. Les enfants marqués `land-reveal` (ou les `land-step-row` des
// aperçus produit) attendent ce signal pour apparaître, l'un après l'autre
// (`--i`), cf. le bloc « Entrée dans l'écran » de app/globals.css.
//
// L'attribut est posé par le script, jamais par le rendu serveur : sans
// JavaScript, ou si le bloc est déjà à l'écran au chargement, rien n'est
// masqué. Il est écrit directement dans le DOM (pas d'état React) : un
// re-rendu ne le remet pas à zéro, et il n'y a pas d'écart d'hydratation.
// Consigne d'animation du site : un mouvement doit dire quelque chose — ici,
// qu'une liste se lit point par point, ou qu'un deal vient d'être analysé.

export function Reveal({
  as = "div",
  className,
  spotlight = false,
  children,
}: {
  as?: "div" | "ul" | "section";
  className?: string;
  /** Les enfants `land-spot` reçoivent la position du pointeur (--mx, --my) :
   * une lueur le suit dans chaque carte et sur sa bordure (globals.css). Un
   * seul écouteur pour toute la liste, et rien sur écran tactile. */
  spotlight?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Une seule balise typée pour TypeScript ; le rendu utilise bien `as`.
  const Tag = as as "div";

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    // Déjà visible au chargement : on ne rejoue rien sous les yeux du lecteur.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset.inview = "false";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.inview = "true";
        io.disconnect();
      },
      // Un bloc haut (la fiche d'un deal) ne franchit jamais 50 % d'un petit
      // écran : on déclenche dès qu'une bande de 80 px est visible.
      { rootMargin: "0px 0px -80px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    for (const card of e.currentTarget.querySelectorAll<HTMLElement>(".land-spot")) {
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - box.left}px`);
      card.style.setProperty("--my", `${e.clientY - box.top}px`);
    }
  };

  return (
    <Tag ref={ref} className={className} onPointerMove={spotlight ? track : undefined}>
      {children}
    </Tag>
  );
}
