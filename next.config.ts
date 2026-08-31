import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les polices du générateur de PDF sont lues à l'exécution via un chemin
  // construit (path.join(process.cwd(), …)). Le traçage de fichiers de Next
  // suit les imports, pas les chemins calculés : sans cette inclusion
  // explicite les .woff manquent du bundle serverless, et l'export PDF
  // fonctionne en local mais tombe en 500 en production.
  outputFileTracingIncludes: {
    "/api/briefs/[id]/pdf": ["./lib/pdf/fonts/**"],
  },
  // En-têtes de sécurité, appliqués à toutes les réponses.
  //
  // Brief affiche des transcripts d'appels clients et des devis : le contenu
  // le plus sensible que l'application manipule. Rien n'empêchait jusqu'ici de
  // l'encadrer dans une iframe sur un site tiers pour piéger un clic.
  //
  // `frame-ancestors 'none'` plutôt que X-Frame-Options seul : c'est la forme
  // moderne, comprise de tous les navigateurs actuels, et la seule qui gère
  // correctement les cadres imbriqués. On garde X-Frame-Options à côté pour
  // les clients anciens, les deux ne se contredisent pas.
  //
  // Pas de CSP complète ici : l'application charge des polices Google, des
  // images de CRM et des enregistrements Recall, et une politique trop serrée
  // casserait en silence. Une CSP mérite d'être construite en mode
  // `report-only` d'abord — chantier à part entière, pas une ligne de config.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // Empêche un navigateur de « deviner » qu'un fichier téléversé est
          // du HTML et de l'exécuter — les imports de références acceptent des
          // fichiers de l'utilisateur.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // L'URL complète d'une page Brief contient des identifiants de call
          // et de devis : on ne les envoie pas aux sites tiers vers lesquels
          // on clique (Pappers, LinkedIn, sites de prospects).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Aucune de ces API n'est utilisée : on les refuse par défaut plutôt
          // que de compter sur le fait que personne ne les appellera.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // HSTS : deux ans, sous-domaines compris. brief-ai.fr n'est servi
          // qu'en HTTPS (Vercel), donc aucun risque de couper un accès.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Notifications moved from a Settings sub-page to its own top-level
      // sidebar item — keeps old bookmarks/links working.
      { source: "/settings/notifications", destination: "/notifications", permanent: true },
    ];
  },
};

export default nextConfig;
