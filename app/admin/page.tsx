import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminLoginGate from "./AdminLoginGate";

// Porte d'entrée de l'admin : connexion, puis le suivi des clients. Toutes
// les pages de l'admin renvoient ici sans session. La configuration du brief,
// qui occupait cette adresse, vit désormais sous /admin/config.
export default async function AdminHomePage() {
  if (await isAdminAuthenticated()) redirect("/admin/clients");
  return <AdminLoginGate />;
}
