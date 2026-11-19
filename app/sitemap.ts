import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

// Pages publiques : l'accueil, les deux pages par public (19/11/2026), les
// pages Comment ça marche, Intégrations et Sécurité, et les pages légales. L'accueil et les pages légales sont
// aussi les URL que l'examen de vérification Google consulte.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${APP_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${APP_URL}/directeurs-commerciaux`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/commerciaux`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/accompagnement`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${APP_URL}/integrations`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/securite`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${APP_URL}/confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.5 },
  ];
}
