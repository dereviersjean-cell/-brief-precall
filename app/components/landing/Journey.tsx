"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type JourneyStep = {
  verb: string;
  /** Moment du rendez-vous suivi (« Mercredi 18:00 »…), affiché sur la frise. */
  when: string;
  /** Le moment en clair (« La veille du rendez-vous »…) : c'est ce qui rend
   * la structure en trois temps lisible d'un coup d'œil. */
  moment: string;
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
// Une couleur par moment, la même partout où il apparaît (titre, frise,
// nappe derrière l'objet) : Préparer en bleu, Débriefer en corail,
// Progresser en soleil.
const TONES = [
  { text: "text-land-accent", soft: "var(--land-accent-soft)", solid: "var(--land-accent)" },
  { text: "text-land-coral-ink", soft: "var(--land-coral-soft)", solid: "var(--land-coral)" },
  { text: "text-land-sun-ink", soft: "var(--land-sun-soft)", solid: "var(--land-sun)" },
];

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function Journey({ steps }: { steps: JourneyStep[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const pinRef = useRef<HTMLDivElement>(null);
  const zoomRefs = useRef<(HTMLDivElement | null)[]>([]);
  const colRef = useRef<HTMLDivElement>(null);
  const [zooms, setZooms] = useState<number[]>(() => steps.map(() => 1));
  const [rail, setRail] = useState<{ top: number; height: number } | null>(null);

  // Chaque objet doit tenir dans l'écran, frise comprise : on MESURE la place
  // disponible et on réduit l'objet si besoin, chacun pour soi. Un zoom
  // commun calé sur le plus grand (l'analyse) réduisait aussi le brief et
  // l'objection à 62 % : texte illisible et grand aplat vide autour.
  // `zoom` plutôt que `transform: scale` : il réduit aussi la place occupée,
  // donc le centrage vertical reste juste. Largeur visuelle inchangée (celle
  // de la colonne) : seule la taille du texte varie d'un objet à l'autre.
  useEffect(() => {
    const pin = pinRef.current;
    if (!pin) return;
    const measure = () => {
      const frise = (pin.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      // 64 : marges du bloc collant ; 24 : écart frise/objet ; 48 : marge
      // intérieure de l'aplat de couleur.
      const room = pin.clientHeight - 64 - frise - 24 - 48;
      setZooms(
        zoomRefs.current.map((el) => {
          if (!el) return 1;
          let z = 1;
          el.style.zoom = "1";
          while (z > 0.62 && el.getBoundingClientRect().height > room) {
            z = Math.max(0.62, z - 0.03);
            el.style.zoom = String(z);
          }
          return z;
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pin);
    return () => ro.disconnect();
  }, []);

  // Rail vertical des trois moments (grand écran) : il relie la pastille de
  // la première étape à celle de la dernière. Positions MESURÉES — elles
  // dépendent de la hauteur des textes.
  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    const measure = () => {
      const dots = col.querySelectorAll<HTMLElement>("[data-journey-dot]");
      if (dots.length < 2) return;
      const base = col.getBoundingClientRect().top;
      const center = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - base;
      };
      const top = center(dots[0]);
      setRail({ top, height: center(dots[dots.length - 1]) - top });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    return () => ro.disconnect();
  }, []);

  // Étape active = celle dont le texte est le plus proche du centre de
  // l'écran, recalculée à chaque franchissement de seuil (trois éléments,
  // trois mesures : négligeable). L'ancienne bande centrale étroite gardait la
  // dernière étape vue quand aucun texte ne la traversait — en arrivant par une
  // ancre on voyait l'objet de « Progresser » au-dessus de « Préparer ».
  useEffect(() => {
    const pick = () => {
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive(best);
    };
    const observer = new IntersectionObserver(pick, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    for (const el of refs.current) if (el) observer.observe(el);
    pick();
    return () => observer.disconnect();
  }, []);

  return (
    // `timeline-scope` rend la timeline de défilement de la colonne de texte
    // visible depuis la frise collante, qui n'en est pas descendante.
    <div className="grid grid-cols-1 [timeline-scope:--journey] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      {/* Marge basse sur grand écran : la colonne de texte doit dépasser la
          dernière étape, sinon l'objet collant se décroche et remonte sous la
          barre de navigation pendant qu'on lit encore « Progresser ». */}
      <div ref={colRef} className="relative [view-timeline:--journey_block] lg:pb-[22vh] lg:pl-16">
        {/* Rail vertical (grand écran) : les trois moments se lisent comme
            des étapes qui descendent. La piste se remplit au rythme de la
            lecture — la ligne de remplissage suit le milieu de l'écran
            (timeline de défilement native, recentrée par
            `view-timeline-inset`), par paliers d'étape ailleurs. */}
        {rail && (
          <div
            aria-hidden
            className="land-rail absolute left-[21px] hidden w-0.5 overflow-hidden rounded-full bg-land-line lg:block"
            style={{ top: rail.top, height: rail.height }}
          >
            <div
              className="land-rail-fill h-full w-full rounded-full"
              style={{
                transform: `scaleY(${active / (steps.length - 1)})`,
                backgroundImage: `linear-gradient(180deg, ${TONES.map((t) => t.solid).join(", ")})`,
              }}
            />
          </div>
        )}
        {steps.map((step, i) => {
          const tone = TONES[i % TONES.length];
          const state = i === active ? "active" : i < active ? "past" : "next";
          return (
            <article
              key={step.verb}
              id={slug(step.verb)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-active={active === i}
              data-state={state}
              className="land-step scroll-mt-24 py-14 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center lg:py-0"
              style={{ "--tone": tone.solid, "--tone-soft": tone.soft } as CSSProperties}
            >
              {/* Numéro et moment en tête de chaque étape (demande de Jean,
                  12/10/2026) : la page doit se lire comme trois moments
                  distincts, pas comme une liste de fonctionnalités. Sur grand
                  écran la pastille se pose sur le rail. */}
              <div className="mb-5 flex items-center gap-3 lg:-ml-16 lg:gap-5">
                <span
                  data-journey-dot
                  className="land-step-dot grid h-11 w-11 shrink-0 place-items-center rounded-full text-[18px] font-semibold tabular-nums text-white"
                  style={{ backgroundColor: tone.solid }}
                >
                  {i + 1}
                </span>
                <span className="land-step-text text-[14px] leading-tight">
                  <span className="block font-semibold text-land-ink">
                    Moment {i + 1} sur {steps.length}
                  </span>
                  <span className="text-land-muted">{step.moment}</span>
                </span>
              </div>
              <div className="land-step-text">
                <h3 className="text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] md:text-[36px]">
                  <span className={tone.text}>{step.verb}.</span> <span className="text-land-ink">{step.title}</span>
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
              </div>
              {/* Mobile et tablette : l'objet suit son texte. */}
              <div className="mt-10 rounded-[28px] p-2.5 sm:p-4 lg:hidden" style={{ backgroundColor: tone.soft }} data-active="true">
                {step.object}
              </div>
            </article>
          );
        })}
      </div>

      {/* Grand écran : l'objet collant. Tous les états sont empilés dans la
          même cellule de grille, donc rien ne saute quand l'un remplace
          l'autre. Chaque objet porte son propre aplat de couleur, à sa
          taille : l'ancienne nappe commune, calée sur le plus grand, laissait
          un grand vide sous le brief et l'objection. */}
      <div className="hidden lg:block">
        <div ref={pinRef} data-journey-pin className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col justify-center py-8">
          {/* Repère compact des trois moments : le rail de la colonne de
              texte porte déjà la progression, ici on rappelle seulement où
              l'on est. */}
          <div className="mb-6 flex justify-center">
            <ol className="inline-flex items-center gap-1 rounded-full border border-land-line bg-land-surface p-1" aria-label="Les trois moments du rendez-vous">
              {steps.map((step, i) => {
                const tone = TONES[i % TONES.length];
                const on = active === i;
                return (
                  <li key={step.verb}>
                    <a
                      href={`#${slug(step.verb)}`}
                      aria-current={on ? "step" : undefined}
                      className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13.5px] font-semibold transition-colors duration-300 ${
                        on ? "text-land-ink" : "text-land-faint hover:text-land-muted"
                      }`}
                      style={on ? { backgroundColor: tone.soft } : undefined}
                    >
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full text-[12px] tabular-nums transition-colors duration-300 ${
                          i <= active ? "text-white" : "bg-land-sunken text-land-faint"
                        }`}
                        style={i <= active ? { backgroundColor: tone.solid } : undefined}
                      >
                        {i + 1}
                      </span>
                      {step.verb}
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="grid">
            {steps.map((step, i) => (
              <div
                key={step.verb}
                className="land-stage-item self-center [grid-area:1/1]"
                data-active={active === i}
                data-past={i < active}
                aria-hidden={active !== i}
                inert={active !== i}
              >
                <div className="rounded-[32px] p-6" style={{ backgroundColor: TONES[i % TONES.length].soft }}>
                  <div
                    ref={(el) => {
                      zoomRefs.current[i] = el;
                    }}
                    style={{ zoom: zooms[i] }}
                  >
                    {step.object}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
