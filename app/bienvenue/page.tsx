import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import { getActivationState, getEnabledModulesForUser, getUserName } from "@/lib/db";
import WelcomeClient from "./WelcomeClient";

export const dynamic = "force-dynamic";

// Présentation du produit + état d'activation du compte. Atteinte
// automatiquement à la fin de l'onboarding, et accessible ensuite depuis
// l'aide — un utilisateur revient souvent chercher « comment ça marche déjà »
// une semaine après son inscription, pas le premier jour.
export default async function BienvenuePage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [activation, name, modules] = await Promise.all([
    getActivationState(userId).catch(() => ({
      // Repli : la présentation reste utile même si l'état d'activation
      // n'a pas pu être calculé.
      steps: [] as Awaited<ReturnType<typeof getActivationState>>["steps"],
      completed: 0,
      total: 0,
    })),
    getUserName(userId),
    // La présentation ne décrit que ce que le compte a : un client en début
    // de parcours n'a ni objections, ni email de suivi, ni CRM.
    getEnabledModulesForUser(userId),
  ]);

  return <WelcomeClient activation={activation} firstName={name?.split(" ")[0] ?? null} modules={modules} />;
}
