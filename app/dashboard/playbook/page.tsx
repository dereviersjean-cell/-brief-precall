import { redirect } from "next/navigation";
import {
  getUserRole,
  getUserOrganizationId,
  ensureDefaultPlaybookForOrganization,
  getPlaybookForOrganization,
  getMeetingStageConfigForOrganization,
} from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import PlaybookClient from "./PlaybookClient";

// Onglet Performance > Playbook (déplacé depuis /team/playbook le
// 29/07/2026). Ouvert aux deux rôles : le commercial consulte en lecture
// seule la grille sur laquelle il est noté, le manager l'édite.
export default async function PlaybookPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, orgId] = await Promise.all([getUserRole(userId), getUserOrganizationId(userId)]);
  if (!orgId) redirect("/dashboard");

  const isManager = role === "manager";

  const [playbook, meetingStageConfig] = await Promise.all([
    // Seul un manager peut provoquer la création du playbook par défaut — une
    // simple consultation par un commercial ne doit rien écrire en base.
    isManager ? ensureDefaultPlaybookForOrganization(orgId, userId) : getPlaybookForOrganization(orgId),
    getMeetingStageConfigForOrganization(orgId),
  ]);

  // Organisation dont le manager n'a jamais ouvert la page : rien à montrer
  // encore, et ce n'est pas au commercial de déclencher l'initialisation.
  if (!playbook) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm italic text-slate-400">
          Votre manager n&apos;a pas encore configuré le playbook de votre équipe.
        </p>
      </div>
    );
  }

  return <PlaybookClient playbook={playbook} meetingStageConfig={meetingStageConfig} readOnly={!isManager} />;
}
