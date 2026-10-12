"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type JourneyStep = {
  verb: string;
  /** Moment du rendez-vous suivi (« Mercredi 18:00 »…), affiché sur la frise. */
  when: string;
  title: string;
  body: string;
  points: { title: string; body: string }[];
  object: ReactNode;
};

// La séquence « un deal, trois moments » de la landing. Sur grand écran, le
// texte des trois étapes défile à gauche pendant que l'objet produit reste
// collé à droite et change d'état : le brief se compile, le call est noté,
// l'objection rejoint la bibliothèque. Sous `lg`, pas d'épinglage (collant +
// tactile = saccades) : chaque étape porte son objet juste sous son texte.
//
// L'étape active est celle dont le texte traverse la bande centrale de
// l'écran (IntersectionObserver, aucune écoute de `scroll`). Sans JS, la
// première étape reste affichée et tout le texte reste lisible.
// Ancre sans accent : « #preparer » plutôt que « #préparer », qui s'encode
// en %C3%A9 dans la barre d'adresse.
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function Journey({ steps }: { steps: JourneyStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = refs.current.indexOf(entry.target as HTMLElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // `timeline-scope` rend la timeline de défilement de la colonne de texte
    // visible depuis la frise collante, qui n'en est pas descendante.
    <div className="grid grid-cols-1 [timeline-scope:--journey] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* Marge basse sur grand écran : la colonne de texte doit dépasser la
          dernière étape, sinon l'objet collant se décroche et remonte sous la
          barre de navigation pendant qu'on lit encore « Progresser ». */}
      <div className="[view-timeline:--journey_block] lg:pb-[22vh]">
        {steps.map((step, i) => (
          <article
            key={step.verb}
            id={slug(step.verb)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-active={active === i}
            className="scroll-mt-24 py-14 transition-opacity duration-500 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center lg:py-0 lg:data-[active=false]:opacity-35"
          >
            {/* Un seul titre en deux tons, le verbe en bleu : pas d'étiquette
                posée au-dessus du titre. */}
            <h3 className="text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] md:text-[36px]">
              <span className="text-land-accent">{step.verb}.</span>{" "}
              <span className="text-land-ink">{step.title}</span>
            </h3>
            <p className="mt-4 max-w-[52ch] text-[16.5px] leading-relaxed text-land-muted">{step.body}</p>
            <ul className="mt-7 space-y-4 border-t border-land-line pt-6">
              {step.points.map((p) => (
                <li key={p.title} className="text-[15px] leading-relaxed">
                  <span className="font-medium text-land-ink">{p.title}.</span>{" "}
                  <span className="text-land-muted">{p.body}</span>
                </li>
              ))}
            </ul>
            {/* Mobile et tablette : l'objet suit son texte. */}
            <div className="mt-10 lg:hidden" data-active="true">
              {step.object}
            </div>
          </article>
        ))}
      </div>

      {/* Grand écran : l'objet collant. Tous les états sont empilés dans la
          même cellule de grille, donc la scène prend la hauteur du plus grand
          et rien ne saute quand l'un remplace l'autre. */}
      <div className="hidden lg:block">
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col justify-center py-10">
          {/* Frise du rendez-vous : une seule piste qui se remplit avec le
              défilement de la séquence (timeline de défilement native), ou
              par paliers d'étape là où le navigateur ne la gère pas. */}
          <div className="mb-6">
            <div className="h-0.5 overflow-hidden rounded-full bg-land-line" aria-hidden>
              <div
                className="land-journey-fill h-full w-full rounded-full bg-land-accent"
                style={{ transform: `scaleX(${(active + 1) / steps.length})` }}
              />
            </div>
            <ol className="mt-3 grid grid-cols-3 gap-3" aria-label="Étapes du rendez-vous">
              {steps.map((step, i) => (
                <li key={step.verb}>
                  <a
                    href={`#${slug(step.verb)}`}
                    aria-current={active === i ? "step" : undefined}
                    className={`block text-[13.5px] font-medium transition-colors duration-300 ${
                      active === i ? "text-land-ink" : "text-land-faint hover:text-land-muted"
                    }`}
                  >
                    {step.verb}
                    <span className="block text-[12.5px] font-normal tabular-nums text-land-faint">{step.when}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid">
            {steps.map((step, i) => (
              <div
                key={step.verb}
                className="land-stage-item [grid-area:1/1]"
                data-active={active === i}
                data-past={i < active}
                aria-hidden={active !== i}
                inert={active !== i}
              >
                {step.object}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
