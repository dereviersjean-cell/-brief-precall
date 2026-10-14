import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getBriefsByUser } from "@/lib/db";
import { loadUpcomingEvents } from "@/lib/upcoming-events";
import BriefToolClient, { type BriefPageInitial } from "./BriefToolClient";

// L'agenda et les briefs sont lus ICI, côté serveur : la page arrive déjà
// remplie. Lus depuis le navigateur, ils laissaient un écran gris pendant une
// seconde à chaque connexion (retour de Jean, 14/10/2026). Pas de
// loading.tsx sur cette route pour la même raison — il s'afficherait pendant
// la lecture ; le retour sur la page reste instantané grâce au cache du
// navigateur (next.config.ts, staleTimes).
export default async function BriefToolPage() {
  const initial = await loadInitial().catch(() => null);
  return <BriefToolClient initial={initial} />;
}

async function loadInitial(): Promise<BriefPageInitial | null> {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  // Sans session ou sans jeton d'agenda, le composant client garde son
  // comportement d'origine (bannière de connexion, lecture côté navigateur).
  if (!auth.ok || !session?.accessToken) return null;
  const [calendar, briefs] = await Promise.all([
    loadUpcomingEvents(session as typeof session & { accessToken: string }, auth.userId),
    getBriefsByUser(auth.userId).catch(() => []),
  ]);
  return {
    events: calendar.ok ? calendar.events : null,
    error: calendar.ok ? null : calendar.error,
    briefs: (briefs ?? []) as BriefPageInitial["briefs"],
  };
}
