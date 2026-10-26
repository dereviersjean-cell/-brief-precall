import { redirect, notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getCallWithAnalysisForManager, getUserName, loadDealMemoryPanel } from "@/lib/db";
import { computeConversationAnalytics } from "@/lib/transcript-analytics";
import { getViewer } from "@/lib/session-user";
import CallDetailClient from "./CallDetailClient";

export default async function TeamMemberCallDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string; callId: string }>;
}) {
  const { commercialId, callId } = await params;
  // Id malformé : 404 plutôt qu'une 22P02 Postgres remontée en erreur 500.
  if (!isUuid(commercialId) || !isUuid(callId)) notFound();
  const viewer = await getViewer();
  if (viewer?.role !== "manager") {
    redirect("/dashboard");
  }

  const call = await getCallWithAnalysisForManager(callId, viewer.userId);
  if (!call) {
    redirect(`/team/${commercialId}`);
  }

  // call.user_id is the commercial being reviewed, not the manager viewing —
  // same resolution as /feedback/[id]/page.tsx.
  const analytics = call.transcript_json
    ? computeConversationAnalytics(call.transcript_json, call.speaker_names_override, await getUserName(call.user_id))
    : null;

  const dealMemory = await loadDealMemoryPanel(viewer.role, viewer.organizationId, call.id);

  return <CallDetailClient call={call} commercialId={commercialId} analytics={analytics} dealMemory={dealMemory} />;
}
