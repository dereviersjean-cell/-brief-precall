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
  async redirects() {
    return [
      // Notifications moved from a Settings sub-page to its own top-level
      // sidebar item — keeps old bookmarks/links working.
      { source: "/settings/notifications", destination: "/notifications", permanent: true },
    ];
  },
};

export default nextConfig;
