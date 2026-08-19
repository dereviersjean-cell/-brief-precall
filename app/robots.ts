import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

// Le domaine brief-ai.fr est neuf (19/08/2026) et n'avait ni robots.txt ni
// sitemap : rien n'indiquait à Googlebot quoi explorer. La vérification OAuth
// s'appuyant sur ce que Google a en index, une page jamais explorée est une
// page qui « n'explique pas l'objet de l'application » de son point de vue.
//
// Seules les pages publiques sont exposées. Tout le reste de l'app est
// derrière l'authentification (middleware.ts) et n'a rien à faire dans un
// index — /api en premier lieu.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/q/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
