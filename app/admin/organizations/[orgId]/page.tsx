import { redirect } from "next/navigation";

// Remplacée le 29/09/2026 par la fiche client de l'espace « Suivi clients ».
// Gardée en redirection pour les favoris et les liens existants.
export default async function OrganizationDetailAdminPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/admin/clients/${orgId}`);
}
