"use client";

import { useEffect, useRef, useState } from "react";
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
  const [loaded, setLoaded] = useState(false);
  const faviconUrl = companyLogoUrlFromDomain(domain);
  const url = src || faviconUrl;
  const imgRef = useRef<HTMLImageElement>(null);

  function check(img: HTMLImageElement) {
    // Sans favicon connu, le service de Google répond 404 avec un globe
    // générique de 16 px — que le navigateur affiche comme une vraie image
    // (constaté le 29/09/2026 sur scutum.com). Les vrais logos demandés en
    // 64 px arrivent en 32 px ou plus : 16 px et moins = pas de logo.
    if (url === faviconUrl && img.naturalWidth <= 16) setFailed(true);
    else setLoaded(true);
  }

  // Image déjà en cache avant que React n'écoute onLoad : l'événement ne
  // viendrait jamais et le logo resterait invisible.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) check(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!url || failed) return <>{fallback}</>;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      ref={imgRef}
      onLoad={(e) => check(e.currentTarget)}
      // Invisible le temps de savoir si c'est un vrai logo : pas de globe qui
      // clignote avant d'être remplacé par l'initiale.
      className={`${className}${loaded ? "" : " invisible"}`}
    />
  );
}
