import { redirect } from "next/navigation";
import { getUserRole, getCallWithAnalysisForManager, getUserName } from "@/lib/db";
import { computeConversationAnalytics } from "@/lib/transcript-analytics";
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

  // call.user_id is the commercial being reviewed, not the manager viewing —
  // same resolution as /feedback/[id]/page.tsx.
  const analytics = call.transcript_json
    ? computeConversationAnalytics(call.transcript_json, call.speaker_names_override, await getUserName(call.user_id))
    : null;

  return <CallDetailClient call={call} commercialId={commercialId} analytics={analytics} />;
}
