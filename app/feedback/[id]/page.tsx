import { isUuid } from "@/lib/uuid";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole, getUserName } from "@/lib/db";
import { computeConversationAnalytics } from "@/lib/transcript-analytics";
import { getEffectiveUserId } from "@/lib/session-user";
import { notFound } from "next/navigation";
import FeedbackDetailClient from "./FeedbackDetailClient";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Id malformé (URL bricolée, lien depuis un écran de démonstration) :
  // 404 plutôt que de laisser Postgres lever une 22P02 en erreur serveur.
  if (!isUuid(id)) notFound();
  const userId = await getEffectiveUserId();

  if (!userId) notFound();

  // Owner first — covers the common case without an extra role lookup.
  let call = await getCallWithAnalysis(id, userId);

  if (!call) {
    const role = await getUserRole(userId);
    if (role === "manager") {
      call = await getCallWithAnalysisForManager(id, userId);
    }
  }

  if (!call) notFound();

  // call.user_id is always the actual owner (correct even when a manager is
  // viewing) — computeConversationAnalytics needs the commercial's real name
  // to identify them among the transcript's speakers.
  const analytics = call.transcript_json
    ? computeConversationAnalytics(call.transcript_json, call.speaker_names_override, await getUserName(call.user_id))
    : null;

  return <FeedbackDetailClient call={call} analytics={analytics} />;
}
