// Bandeau de logos et couleur d'encre du haut de page, partagés par la
// landing et la page de connexion (même univers visuel, demande de Jean du
// 12/10/2026).

/** Bleu de l'aplat du haut de page : la couleur du bas de l'illustration. */
export const HERO_INK = "#3E4D93";

// Bandeau de logos (remis à la demande de Jean, 12/10/2026). Ce sont les
// clients qu'a accompagnés l'équipe derrière Brief (Oliverlist, avec son
// accord : « on a le droit »), pas des utilisateurs de Brief : la légende le
// dit sans nommer Oliverlist, que Jean ne veut plus voir sur la page pour
// l'instant. Fichiers repris de oliverlist.com, monochromes, rendus en masque
// CSS pour prendre la couleur du texte (ici blanc sur l'aplat bleu). Hauteurs
// ajustées à l'œil : un logo carré (Leader Price) ou très gras (Sony) ne se
// lit pas à la même hauteur qu'un logotype en ligne.
const CLIENT_LOGOS: { name: string; file: string; ratio: number; h: number }[] = [
  { name: "Sony", file: "sony", ratio: 362 / 64, h: 18 },
  { name: "PayFit", file: "payfit", ratio: 206 / 64, h: 26 },
  { name: "BNP Paribas", file: "bnp", ratio: 286 / 64, h: 26 },
  { name: "Livestorm", file: "livestorm", ratio: 380 / 64, h: 24 },
  { name: "Eskimoz", file: "eskimoz", ratio: 276 / 64, h: 23 },
  { name: "Alibaba Group", file: "alibaba", ratio: 150 / 64, h: 31 },
  { name: "Regate", file: "regate", ratio: 254 / 64, h: 25 },
  { name: "Pitchy", file: "pitchy", ratio: 236 / 64, h: 26 },
  { name: "Leader Price", file: "leaderprice", ratio: 60 / 64, h: 36 },
  { name: "Beetween", file: "beetween", ratio: 350 / 64, h: 22 },
  { name: "Abilways", file: "abilways", ratio: 214 / 64, h: 29 },
  { name: "KÖM", file: "kom", ratio: 110 / 64, h: 27 },
];

function LogoRow({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-12 pr-12 sm:gap-16 sm:pr-16">
      {CLIENT_LOGOS.map((l) => (
        <li
          key={l.file}
          role="img"
          aria-label={hidden ? undefined : l.name}
          className="shrink-0 bg-current"
          style={{
            height: l.h,
            width: Math.round(l.h * l.ratio),
            WebkitMask: `url(/landing/logos/${l.file}.png) center / contain no-repeat`,
            mask: `url(/landing/logos/${l.file}.png) center / contain no-repeat`,
          }}
        />
      ))}
    </ul>
  );
}

export function ClientLogos({ className = "" }: { className?: string }) {
  return (
    <div className={`land-hero-text relative ${className}`} style={{ "--i": 2 } as React.CSSProperties}>
      <p className="text-[13px] text-white/65">L&apos;équipe derrière Brief a accompagné les équipes commerciales de</p>
      <div className="land-marquee-mask mt-5 overflow-hidden text-white/80">
        <div className="land-marquee">
          <LogoRow />
          <LogoRow hidden />
        </div>
      </div>
    </div>
  );
}

