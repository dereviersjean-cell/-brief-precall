"use client";

import { useEffect, useRef } from "react";

// Un chiffre qui défile jusqu'à sa valeur quand il arrive à l'écran (principe
// du Number Ticker de Magic UI et du Count Up de React Bits, réécrit sans
// dépendance). Le rendu serveur porte déjà la valeur finale : sans JavaScript,
// ou sous mouvement réduit, on lit simplement le chiffre. Le texte est écrit
// dans le DOM image par image, sans état React.

const text = (n: number, format: "int" | "euros") =>
  format === "euros" ? `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0€` : String(Math.round(n));

export function Ticker({ value, format }: { value: number; format: "int" | "euros" }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let frame = 0;
    const final = el.textContent;
    const run = () => {
      const start = performance.now();
      const duration = 900;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Décélération : le chiffre ralentit en arrivant.
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = t < 1 ? text(value * eased, format) : final;
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        run();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = final;
    };
  }, [value, format]);

  return (
    <span ref={ref} className="tabular-nums">
      {text(value, format)}
    </span>
  );
}
