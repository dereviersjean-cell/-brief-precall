// Logos des entreprises FICTIVES des exemples (Valdor Emballages, le
// prospect ; Cartonnerie du Val, la référence client). Dessinés pour la page,
// en couleur, comme les logos que l'app affiche à côté de chaque entreprise
// (`CompanyLogo`). Aucune vraie marque : les noms sont inventés et les aperçus
// le disent en légende.

export function ValdorLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Un « V » plié comme un carton ouvert, sur un vert sapin.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Logo Valdor Emballages"
      className={`shrink-0 ${className}`}
    >
      {/* Aplat plutôt que dégradé : un dégradé référencé par id casse quand
          la première occurrence du logo est masquée (display: none). */}
      <rect width="40" height="40" rx="10" fill="#0B6B58" />
      <path d="M9 11h7l4 11 4-11h7l-8.2 19h-5.6z" fill="#fff" />
      <path d="M16 11l4 11-2.8 8L9 11z" fill="#C8F0DF" />
    </svg>
  );
}

export function CartonnerieLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  // Une caisse en perspective, couleur kraft.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Logo Cartonnerie du Val"
      className={`shrink-0 ${className}`}
    >
      <rect width="40" height="40" rx="10" fill="#C2772F" />
      <path d="M20 8.5l10.5 5.2v12.6L20 31.5 9.5 26.3V13.7z" fill="#F6D7A7" />
      <path d="M20 8.5l10.5 5.2L20 18.9 9.5 13.7z" fill="#FFF3DF" />
      <path d="M20 18.9v12.6l10.5-5.2V13.7z" fill="#E9B56E" />
      <path d="M14.8 11.1l10.5 5.2v4" stroke="#C2772F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Entreprises connues du « Suivi des deals » ──────────────────────────────
// Demande de Jean (19/11/2026) : de vrais logos, en couleur, plutôt que des
// entreprises inventées. Les sigles viennent de la bibliothèque libre Simple
// Icons (simpleicons.org, version 13 ; fichiers dans public/landing/brands,
// téléchargés avec l'accord de Jean), les couleurs sont celles qu'elle publie
// pour chaque marque. Chaque sigle est un tracé d'une seule teinte, rendu en
// masque CSS dans sa couleur, sur une pastille légèrement teintée.
// Les marques restent la propriété de leurs titulaires : l'aperçu les cite
// comme exemples et le dit en pied.

const BRANDS: Record<string, { file: string; color: string }> = {
  Renault: { file: "renault", color: "#1A1A1A" }, // le losange actuel est noir ; le jaune publié se lit mal sur clair
  Carrefour: { file: "carrefour", color: "#004E9F" },
  Airbus: { file: "airbus", color: "#00205B" },
  Orange: { file: "orange", color: "#FF7900" },
  SNCF: { file: "sncf", color: "#CA0939" },
  "Leroy Merlin": { file: "leroymerlin", color: "#5E9A12" }, // vert publié (#78BE20) foncé d'un cran pour le contraste
  "Schneider Electric": { file: "schneiderelectric", color: "#1F9E3A" }, // idem (#3DCD58)
  "Dassault Systèmes": { file: "dassaultsystemes", color: "#005386" },
};

/** La pastille d'une entreprise connue, par son nom ; rien si elle n'y est pas. */
export function BrandTile({ name, size = 36 }: { name: string; size?: number }) {
  const brand = BRANDS[name];
  if (!brand) return null;
  const glyph = Math.round(size * 0.6);
  const url = `url(/landing/brands/${brand.file}.svg) center / contain no-repeat`;
  return (
    <span
      role="img"
      aria-label={`Logo ${name}`}
      className="grid shrink-0 place-items-center rounded-[10px] ring-1 ring-inset ring-black/5"
      style={{ width: size, height: size, backgroundColor: `color-mix(in oklab, ${brand.color} 11%, white)` }}
    >
      <span style={{ width: glyph, height: glyph, backgroundColor: brand.color, WebkitMask: url, mask: url }} />
    </span>
  );
}
