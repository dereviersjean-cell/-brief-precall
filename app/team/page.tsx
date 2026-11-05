import { redirect } from "next/navigation";

// L'écran Équipe a rejoint Paramètres le 05/11/2026 (maquette H1 B) : cette
// adresse reste pour les favoris et les liens déjà envoyés.
export default function TeamPage() {
  redirect("/settings/equipe");
}
