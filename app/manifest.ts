import type { MetadataRoute } from "next";

// Manifeste PWA — Brief installable sur l'écran d'accueil.
//
// Next l'expose sur /manifest.webmanifest et injecte lui-même le <link>
// correspondant : rien à déclarer dans le layout.
//
// Ce fichier ne fait PAS de Brief une application hors ligne : aucun service
// worker n'est enregistré, donc l'app installée a toujours besoin du réseau.
// C'était le choix explicite du 31/08/2026 — l'icône sur l'écran d'accueil et
// le plein écran, sans le reste.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brief — Préparez chaque call",
    short_name: "Brief",
    description:
      "Préparez chaque rendez-vous commercial en deux minutes, et débriefez-le automatiquement.",
    lang: "fr",
    // On entre par le tableau de bord, pas par la page marketing : quelqu'un
    // qui a installé l'app est déjà convaincu. Le middleware renvoie vers
    // /login s'il n'a pas de session.
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Le fond de l'app (slate-50), pour que l'écran de démarrage ne clignote
    // pas dans une autre couleur que la page qui lui succède.
    background_color: "#F8FAFC",
    // Blanc et non le bleu de marque : cette couleur teinte la barre du
    // navigateur, collée à une TopBar blanche. Un bleu vif y créerait une
    // couture visible au lieu de se fondre.
    theme_color: "#FFFFFF",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android recadre selon le constructeur (cercle, goutte, squircle) : le
      // « B » occupe 50 % de la hauteur, largement dans le disque de sécurité
      // de 80 %, donc le même dessin sert pour les deux usages.
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
