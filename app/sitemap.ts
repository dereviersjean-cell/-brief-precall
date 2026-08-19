import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

// Les trois seules pages publiques : la landing et les deux pages légales.
// Ce sont aussi les trois URL que l'examen de vérification Google consulte.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${APP_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: `${APP_URL}/mentions-legales`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
