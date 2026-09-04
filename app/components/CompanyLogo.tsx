"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { companyLogoUrlFromDomain } from "@/lib/company-domain";

/**
 * Logo d'entreprise, avec repli sur ce qui était affiché avant lui (une
 * initiale, généralement).
 *
 * Deux sources, dans cet ordre : `src` quand l'annuaire nous a donné un vrai
 * logo (meilleure qualité, déjà payé), sinon le favicon déduit du domaine.
 *
 * Le repli n'est pas un détail : un favicon manque pour beaucoup de domaines,
 * et une image cassée serait pire que l'initiale qu'elle remplace. Le parent
 * fournit donc toujours son propre `fallback`, ce qui garde aussi l'apparence
 * cohérente d'un écran à l'autre.
 */
export default function CompanyLogo({
  src,
  domain,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  domain?: string | null;
  alt: string;
  className: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const url = src || companyLogoUrlFromDomain(domain);

  if (!url || failed) return <>{fallback}</>;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
