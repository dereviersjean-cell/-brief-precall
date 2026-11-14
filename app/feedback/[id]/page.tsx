import { isUuid } from "@/lib/uuid";
import {
  getCallWithAnalysis,
  getCallWithAnalysisForManager,
  getDealCallDetails,
  getDealMemoryObjections,
  getDealPageFiches,
  getUserName,
  loadDealMemoryPanel,
} from "@/lib/db";
import { buildDealTimeline } from "@/lib/deal-timeline";
import { buildMeetingOverview, type MeetingOverview } from "@/lib/meeting-overview";
import { computeConversationAnalytics } from "@/lib/transcript-analytics";
import { getViewer } from "@/lib/session-user";
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
  const initialTab = tab === "email" || tab === "transcript" || tab === "deal" ? tab : "overview";
  // Id malformé (URL bricolée, lien depuis un écran de démonstration) :
  // 404 plutôt que de laisser Postgres lever une 22P02 en erreur serveur.
  if (!isUuid(id)) notFound();
  const viewer = await getViewer();

  if (!viewer) notFound();
  const { userId, role } = viewer;

  // Propriétaire d'abord (le cas courant). Le nom part dans le même
  // aller-retour : la page enchaînait cinq requêtes l'une après l'autre, le
  // propriétaire n'en attend plus qu'une salve.
  const [owned, viewerName] = await Promise.all([getCallWithAnalysis(id, userId), getUserName(userId)]);
  const call = owned ?? (role === "manager" ? await getCallWithAnalysisForManager(id, userId) : null);

  if (!call) notFound();

  // call.user_id is always the actual owner (correct even when a manager is
  // viewing) — computeConversationAnalytics needs the commercial's real name
  // to identify them among the transcript's speakers. Read alongside the deal
  // panel (03/11/2026, fluidité).
  const [dealMemory, ownerName] = await Promise.all([
    loadDealMemoryPanel(role, viewer.organizationId, call.id),
    call.user_id === userId ? Promise.resolve(viewerName) : getUserName(call.user_id),
  ]);
  const analytics = call.transcript_json
    ? computeConversationAnalytics(call.transcript_json, call.speaker_names_override, ownerName)
    : null;

  const meeting = await loadMeetingOverview(call, dealMemory, viewer.organizationId, ownerName).catch((err) => {
    console.error("[feedback] meeting overview failed:", err instanceof Error ? err.message : String(err));
    return null;
  });

  // « Analyse rendez-vous » n'est plus au menu des organisations en test des
  // deals (03/11/2026) : on revient au deal du call.
  const back = meeting && dealMemory?.deal ? { backHref: `/deal/${dealMemory.deal.id}`, backLabel: `Retour au deal ${dealMemory.deal.name}` } : {};

  return <FeedbackDetailClient call={call} analytics={analytics} initialTab={initialTab} dealMemory={dealMemory} meeting={meeting} {...back} />;
}

// L'Overview en cinq blocs (synthèse produit du 03/11/2026) quand le call a sa
// fiche deal ; sinon l'écran garde l'ancienne vue d'ensemble.
async function loadMeetingOverview(
  call: NonNullable<Awaited<ReturnType<typeof getCallWithAnalysis>>>,
  dealMemory: Awaited<ReturnType<typeof loadDealMemoryPanel>>,
  organizationId: string | null,
  ownerName: string | null
): Promise<MeetingOverview | null> {
  const dealId = dealMemory?.deal?.id;
  if (!dealMemory?.initial || !dealId || !organizationId) return null;
  const fiches = (await getDealPageFiches(dealId, organizationId)) ?? [];
  if (!fiches.some((f) => f.callId === call.id)) return null;
  const [objectionLists, details] = await Promise.all([
    Promise.all(fiches.map((f) => getDealMemoryObjections(f.callId).catch(() => []))),
    getDealCallDetails(fiches.map((f) => f.callId)).catch(() => ({})),
  ]);
  const timeline = buildDealTimeline(
    fiches,
    dealMemory.rules,
    details,
    Object.fromEntries(fiches.map((f, i) => [f.callId, objectionLists[i]]))
  );
  return buildMeetingOverview({
    fiches,
    callId: call.id,
    timeline,
    rules: dealMemory.rules,
    summary: call.analysis?.summary ?? null,
    strengths: call.analysis?.strengths ?? null,
    weaknesses: call.analysis?.weaknesses ?? null,
    ownerFirstName: ownerName?.split(" ")[0] ?? null,
  });
}
