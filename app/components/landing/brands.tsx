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
