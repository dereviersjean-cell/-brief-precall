"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Testimonial } from "./testimonials-data";

// Carrousel des grands témoignages : grand portrait à gauche, citation à
// droite, et une rangée de sélecteurs (photo + nom) en dessous.
//
// Défilement automatique SANS minuteur : la barre de progression du sélecteur
// actif est une animation CSS de 8 s, et c'est sa fin (`animationend`) qui
// passe au témoignage suivant. Le survol, le focus clavier et la sortie de
// l'écran la mettent en pause (animation-play-state), donc on ne change jamais
// de témoignage sous les yeux de quelqu'un qui lit. Mouvement réduit : pas
// d'animation, donc pas de défilement automatique.
// Tous les témoignages sont empilés dans la même cellule de grille : la
// hauteur est celle du plus long, rien ne saute en changeant.

export function CompanyMark({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md font-bold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.5 }}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const many = items.length > 1;

  return (
    <div ref={rootRef} className="land-carousel" data-inview={inView}>
      <div className="grid">
        {items.map((t, i) => (
          <figure
            key={t.name}
            data-active={active === i}
            aria-hidden={active !== i}
            inert={active !== i}
            className="land-quote grid grid-cols-1 items-center gap-10 [grid-area:1/1] md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:gap-14 lg:gap-20"
          >
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] sm:max-w-[340px] md:max-w-none">
              <div aria-hidden className="absolute -inset-3 rounded-[32px] bg-land-accent-soft sm:-inset-4" />
              <div className="relative h-full overflow-hidden rounded-[24px] bg-land-sunken shadow-[var(--land-shadow-lg)]">
                <Image
                  src={t.photo}
                  alt={t.name}
                  fill
                  sizes="(min-width: 768px) 35vw, 340px"
                  className="land-quote-photo object-cover"
                  priority={i === 0}
                />
              </div>
              <span className="absolute -bottom-4 left-6 grid h-14 w-14 place-items-center rounded-2xl bg-land-accent text-[34px] font-semibold leading-none text-white shadow-[var(--land-shadow)]">
                «
              </span>
            </div>
            <div className="land-quote-text">
              <blockquote className="text-[28px] font-semibold leading-[1.18] tracking-[-0.03em] text-land-ink md:text-[38px] lg:text-[44px]">
                « {t.quote[0]} <span className="text-land-faint">{t.quote[1]} »</span>
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3 border-t border-land-line pt-6">
                <CompanyMark name={t.company} color={t.color} size={36} />
                <span>
                  <span className="block text-[17px] font-semibold text-land-ink">{t.name}</span>
                  <span className="block text-[15px] text-land-muted">
                    {t.role}, {t.company}
                  </span>
                </span>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>

      {many && (
        <div className="mt-14 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="tablist" aria-label="Témoignages">
          {items.map((t, i) => {
            const on = active === i;
            return (
              <button
                key={t.name}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition-colors duration-300 ${
                  on ? "border-land-line bg-land-surface shadow-[var(--land-shadow)]" : "border-transparent hover:bg-land-surface/60"
                }`}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-land-sunken">
                  <Image src={t.photo} alt="" fill sizes="44px" className="object-cover object-top" />
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[14.5px] font-semibold ${on ? "text-land-ink" : "text-land-muted"}`}>{t.name}</span>
                  <span className="block truncate text-[12.5px] text-land-faint">
                    {t.role}, {t.company}
                  </span>
                </span>
                {on && (
                  <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-land-line">
                    <span
                      key={active}
                      className="land-quote-progress block h-full w-full rounded-full bg-land-accent"
                      onAnimationEnd={() => setActive((a) => (a + 1) % items.length)}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
