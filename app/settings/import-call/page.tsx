import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getUserName, getUserEmail, getCommercialsForManager } from "@/lib/db";
import ImportCallClient from "./ImportCallClient";

export const dynamic = "force-dynamic";

// Banc d'essai du pipeline d'analyse : déposer un transcript de vrai call et
// voir ce que Brief en tire (scores playbook, objections détectées et
// classées, points clés). Rangé dans Paramètres et réservé aux managers —
// c'est un outil de calibrage de la configuration d'équipe, pas une action
// du quotidien commercial.
export default async function ImportCallPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const role = await getUserRole(userId);
  if (role !== "manager") redirect("/settings/general");

  const [name, email, commercials] = await Promise.all([
    getUserName(userId),
    getUserEmail(userId),
    getCommercialsForManager(userId),
  ]);

  return (
    <ImportCallClient
      currentUser={{ id: userId, label: name ?? email ?? "Moi" }}
      commercials={commercials.map((c) => ({ id: c.id, label: c.name ?? c.email }))}
    />
  );
}
