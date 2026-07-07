import { redirect } from "next/navigation";
import { getUserRole, getCallWithAnalysisForManager } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import CallDetailClient from "./CallDetailClient";

export default async function TeamMemberCallDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string; callId: string }>;
}) {
  const { commercialId, callId } = await params;
  const userId = await getEffectiveUserId();

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const call = await getCallWithAnalysisForManager(callId, userId!);
  if (!call) {
    redirect(`/team/${commercialId}`);
  }

  return <CallDetailClient call={call} commercialId={commercialId} />;
}
