import { isUuid } from "@/lib/uuid";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole, getUserName } from "@/lib/db";
import { computeConversationAnalytics } from "@/lib/transcript-analytics";
import { getEffectiveUserId } from "@/lib/session-user";
import { notFound } from "next/navigation";
import FeedbackDetailClient from "./FeedbackDetailClient";

export default async function FeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  // `?tab=email` : les boutons de relance de la liste mènent directement à
  // l'onglet Email de suivi plutôt qu'à la vue d'ensemble.
  const { tab } = await searchParams;
  const initialTab = tab === "email" || tab === "transcript" ? tab : "overview";
  // Id malformé (URL bricolée, lien depuis un écran de démonstration) :
  // 404 plutôt que de laisser Postgres lever une 22P02 en erreur serveur.
  if (!isUuid(id)) notFound();
  const userId = await getEffectiveUserId();

  if (!userId) notFound();

  // Propriétaire d'abord (le cas courant). Le rôle et le nom partent dans le
  // même aller-retour : la page enchaînait cinq requêtes l'une après l'autre,
  // le propriétaire n'en attend plus qu'une salve.
  const [owned, role, viewerName] = await Promise.all([getCallWithAnalysis(id, userId), getUserRole(userId), getUserName(userId)]);
  const call = owned ?? (role === "manager" ? await getCallWithAnalysisForManager(id, userId) : null);

  if (!call) notFound();

  // call.user_id is always the actual owner (correct even when a manager is
  // viewing) — computeConversationAnalytics needs the commercial's real name
  // to identify them among the transcript's speakers.
  const ownerName = call.user_id === userId ? viewerName : await getUserName(call.user_id);
  const analytics = call.transcript_json
    ? computeConversationAnalytics(call.transcript_json, call.speaker_names_override, ownerName)
    : null;

  return <FeedbackDetailClient call={call} analytics={analytics} initialTab={initialTab} />;
}
