import { redirect } from "next/navigation";

// Module Tasks masqué depuis le recentrage produit de juillet 2026 (focus
// taux de closing) : les pages sont inaccessibles mais le code, les routes
// API et les crons Inngest restent en place. Pour réactiver : restaurer le
// layout d'origine (git log sur ce fichier) et remettre l'entrée « Tasks »
// dans AppSidebar.tsx.
export default function TasksLayout() {
  redirect("/dashboard");
}
