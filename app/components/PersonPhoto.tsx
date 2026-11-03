"use client";

import { useState } from "react";

// Une teinte stable tirée d'un nom, pour les initiales sans photo.
export function nameHue(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// La photo d'une personne (Google / Microsoft), sinon ses initiales.
export default function PersonPhoto({ name, url, size }: { name: string; url: string | null; size: 28 | 44 }) {
  const [broken, setBroken] = useState(false);
  const box = size > 40 ? "h-11 w-11" : "h-7 w-7";
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${box} shrink-0 rounded-full object-cover ring-1 ring-stone-200`} />;
  }
  const h = nameHue(name);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${box} grid shrink-0 place-items-center rounded-full font-semibold`}
      style={{ fontSize: size * 0.38, background: `hsl(${h} 70% 93%)`, color: `hsl(${h} 55% 32%)` }}
    >
      {initials}
    </span>
  );
}
