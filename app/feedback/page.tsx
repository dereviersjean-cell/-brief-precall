import { getCallsWithAnalysis, getCommercialsForManager, getDealLinksForCalls, getUserName } from "@/lib/db";
import { getViewer } from "@/lib/session-user";
import { nowMs } from "@/lib/format";
import CallLibrary from "./CallLibrary";

// « Analyse rendez-vous » = la bibliothèque de tous les calls passés
// (structure cible de Jean, 27/10/2026, sur le modèle de Claap) : les
// statistiques clés de la personne en tête, puis de quoi retrouver vite
// n'importe quel call. L'analyse détaillée est sur la page du call. Un
// manager peut choisir l'un de ses commerciaux liés (?commercial=<id>).
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ commercial?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return <CallLibrary calls={[]} dealLinks={{}} commercialName={null} people={[]} selectedId={null} now={nowMs()} />;

  const { commercial } = await searchParams;
  const commercials = viewer.role === "manager" ? await getCommercialsForManager(viewer.userId).catch(() => []) : [];
  // Un id absent des commerciaux liés retombe sur ses propres calls, sans
  // erreur qui confirmerait l'existence d'un autre compte.
  const targetId = commercial && commercials.some((c) => c.id === commercial) ? commercial : viewer.userId;

  // Le nom du commercial sert à le RETIRER de la liste des participants d'un
  // call : ce qu'on veut afficher, c'est la personne d'en face.
  const [calls, commercialName, ownName] = await Promise.all([
    getCallsWithAnalysis(targetId),
    getUserName(targetId),
    getUserName(viewer.userId),
  ]);
  const dealLinks = await getDealLinksForCalls(calls.map((c) => c.id)).catch(() => ({}));
  const people =
    commercials.length > 0
      ? [{ id: viewer.userId, name: ownName ?? "Moi" }, ...commercials.map((c) => ({ id: c.id, name: c.name ?? c.email }))]
      : [];

  return <CallLibrary calls={calls} dealLinks={dealLinks} commercialName={commercialName} people={people} selectedId={targetId} now={nowMs()} />;
}
