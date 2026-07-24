import { redirect } from "next/navigation";
import { getUserRole, getUserOrganizationId, ensureDefaultPlaybookForOrganization, getMeetingStageConfigForOrganization } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import PlaybookClient from "./PlaybookClient";

export default async function PlaybookPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/team");
  }

  const orgId = await getUserOrganizationId(userId!);
  if (!orgId) {
    redirect("/team");
  }

  const [playbook, meetingStageConfig] = await Promise.all([
    ensureDefaultPlaybookForOrganization(orgId, userId!),
    getMeetingStageConfigForOrganization(orgId),
  ]);

  return <PlaybookClient playbook={playbook} meetingStageConfig={meetingStageConfig} />;
}
