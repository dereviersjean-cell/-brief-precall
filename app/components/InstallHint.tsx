"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISSED_KEY = "brief-install-hint-dismissed";

// L'invitation à installer Brief sur l'écran d'accueil.
//
// iOS n'a pas de bouton « Installer » : Safari ne propose rien, il faut passer
// par Partager → Sur l'écran d'accueil. Sans cette indication, le manifeste et
// les icônes livrés le 31/08/2026 ne servent à rien — personne ne devine.
//
// Trois conditions, pour ne jamais s'afficher là où il ne sert à rien :
//   1. appareil tactile — sur un ordinateur, l'écran d'accueil n'existe pas ;
//   2. pas déjà installé — sinon on explique à quelqu'un ce qu'il a déjà fait ;
//   3. pas déjà écarté — une invitation qui revient devient un reproche.
//
// La détection se fait sur les capacités (`hover: none`, `display-mode`), pas
// sur l'agent utilisateur : le UA sniffing se périme à chaque version de
// navigateur, les capacités non.
export default function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Après le montage et pas pendant le rendu : `matchMedia` et
    // `localStorage` n'existent pas côté serveur, et un rendu qui les lit
    // ferait diverger le HTML serveur du HTML client.
    try {
      const touch = window.matchMedia("(hover: none)").matches;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari iOS n'implémente pas `display-mode` pour les apps ajoutées à
        // l'écran d'accueil : il expose ce booléen non standard à la place.
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      const dismissed = window.localStorage.getItem(DISMISSED_KEY) === "1";
      setVisible(touch && !standalone && !dismissed);
    } catch {
      // Navigation privée, stockage bloqué : on n'affiche rien plutôt que de
      // risquer une invitation qu'on ne saura jamais faire taire.
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Sans stockage, l'invitation reviendra au prochain chargement. C'est
      // le comportement le moins mauvais : elle reste écartable à chaque fois.
    }
  }

  return (
    <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-4 py-3 lg:hidden">
      <Share className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--violet)]" />
      <p className="flex-1 text-[13px] leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">Installez Brief sur votre écran d&apos;accueil.</span>{" "}
        Appuyez sur <span className="font-medium">Partager</span>, puis sur{" "}
        <span className="font-medium">Sur l&apos;écran d&apos;accueil</span> — Brief s&apos;ouvrira en plein écran,
        comme une application.
      </p>
      <button
        onClick={dismiss}
        aria-label="Masquer cette information"
        className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
