import { redirect } from "next/navigation";

// Le Playbook a déménagé dans Performance le 29/07/2026 (onglet à côté de
// Objections). On garde cette route en redirection plutôt que de la
// supprimer : elle est en favori chez les managers et référencée dans des
// emails d'onboarding déjà envoyés.
export default function LegacyPlaybookPage() {
  redirect("/dashboard/playbook");
}
