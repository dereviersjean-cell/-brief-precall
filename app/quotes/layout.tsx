import { redirect } from "next/navigation";

// Module Devis masqué depuis le recentrage produit de juillet 2026 (focus
// taux de closing) : les pages sont inaccessibles mais le code, les routes
// API et le signal win/loss des devis acceptés/refusés restent actifs.
// Pour réactiver : restaurer le layout d'origine (git log sur ce fichier)
// et remettre l'entrée « Devis » dans AppSidebar.tsx.
export default function QuotesLayout() {
  redirect("/dashboard");
}
