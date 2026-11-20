"use client";

import { usePathname } from "next/navigation";
import PerformanceTabs from "@/app/components/PerformanceTabs";

// Les onglets Performance n'ont de sens que sur les écrans de démonstration de
// Performance, qui doublent des pages sorties de la barre latérale le
// 27/10/2026. Depuis le 20/11/2026 la visite guidée entre par /demo/feedback :
// y laisser ces onglets annoncerait une section que le produit ne montre plus.
const PERFORMANCE_PATHS = ["/demo/dashboard", "/demo/scores", "/demo/analytics"];

export default function DemoPerformanceTabs() {
  const pathname = usePathname();
  if (!PERFORMANCE_PATHS.includes(pathname)) return null;
  return <PerformanceTabs />;
}
