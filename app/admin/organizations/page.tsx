import { redirect } from "next/navigation";

// Remplacée le 29/09/2026 par l'espace « Suivi clients ». Gardée en
// redirection pour les favoris.
export default function OrganizationsAdminPage() {
  redirect("/admin/clients");
}
