import { redirect } from "next/navigation";
import { getUserRole, getUserOrganizationId, getMeetingStageConfigForOrganization } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import MeetingStagesClient from "./MeetingStagesClient";

export const dynamic = "force-dynamic";

export default async function MeetingStagesPage() {
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/team");
  }

  const orgId = await getUserOrganizationId(userId!);
  if (!orgId) {
    redirect("/team");
  }

  const config = await getMeetingStageConfigForOrganization(orgId);

  return <MeetingStagesClient initialConfig={config} />;
}
