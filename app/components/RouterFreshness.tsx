"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTER_STALE_SECONDS } from "@/lib/router-cache";

// Retour instantané sur une page déjà visitée, données à jour quand même.
//
// next.config.ts garde en mémoire du navigateur chaque page visitée pendant
// ROUTER_STALE_SECONDS : en y revenant, Next la réaffiche aussitôt au lieu de
// redemander le rendu au serveur (et de montrer le squelette). Seul, ce cache
// montrerait des données figées — un call analysé entre-temps, un réglage
// modifié ailleurs. D'où ce composant : quand on revient sur une page servie
// depuis le cache, il la relit en arrière-plan. L'écran reste affiché pendant
// la relecture, puis se met à jour sans clignoter.
//
// Le cache vit en mémoire de l'onglet : un rechargement ou une déconnexion
// (qui recharge la page) repart de zéro, il ne peut pas montrer les données
// d'un autre compte.
const lastVisit = new Map<string, number>();

export default function RouterFreshness() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const now = Date.now();
    const previous = lastVisit.get(pathname);
    lastVisit.set(pathname, now);
    // Page déjà vue dans la fenêtre du cache : elle vient d'être servie depuis
    // la mémoire, on la relit. Au-delà, Next l'a de toute façon redemandée au
    // serveur — la relire une seconde fois serait du gaspillage.
    if (previous !== undefined && now - previous < ROUTER_STALE_SECONDS * 1000) router.refresh();
  }, [pathname, router]);
  return null;
}
