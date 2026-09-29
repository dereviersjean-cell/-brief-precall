"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { companyLogoUrl } from "@/lib/company-domain";

/**
 * Logo d'entreprise, avec repli sur ce qui était affiché avant lui (une
 * initiale, généralement).
 *
 * Deux sources, dans cet ordre : `src` quand l'annuaire nous a donné un vrai
 * logo (meilleure qualité, déjà payé), sinon le logo trouvé par le serveur à
 * partir du domaine et du nom de l'entreprise (app/api/company-logo).
 *
 * Le repli n'est pas un détail : un favicon manque pour beaucoup de domaines,
 * et une image cassée serait pire que l'initiale qu'elle remplace. Le parent
 * fournit donc toujours son propre `fallback`, ce qui garde aussi l'apparence
 * cohérente d'un écran à l'autre.
 */
export default function CompanyLogo({
  src,
  domain,
  name,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  domain?: string | null;
  // Nom de l'entreprise : permet de trouver son site quand le domaine de
  // l'adresse email n'a pas de logo (ou pas de site).
  name?: string | null;
  alt: string;
  className: string;
  fallback: ReactNode;
}) {
  const [srcFailed, setSrcFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Logo de l'annuaire d'abord ; s'il ne charge pas, celui trouvé par le
  // serveur plutôt que l'initiale directement.
  const usingSrc = !!src && !srcFailed;
  const url = usingSrc ? src : companyLogoUrl(domain, name);

  if (!url || failed) return <>{fallback}</>;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      onError={() => (usingSrc ? setSrcFailed(true) : setFailed(true))}
      // Image déjà en cache avant que React n'écoute onLoad : l'événement ne
      // viendrait jamais et le logo resterait invisible.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      // Invisible jusqu'au chargement : pas d'icône d'image cassée le temps
      // que le serveur réponde qu'il n'a rien trouvé.
      className={`${className}${loaded ? "" : " invisible"}`}
    />
  );
}
