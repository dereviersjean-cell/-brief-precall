import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import {
  getOrganizationDealRules,
  getProgressFichesForUser,
  getRecentBriefsForUser,
  getUserOrganizationId,
  getUserProfile,
  isDealMemoryEnabledForOrganization,
} from "@/lib/db";
import { buildDealProgressNow } from "@/lib/deal-progress";
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
  // Compte sans profil (onboarding jamais terminé) : l'onboarding d'abord.
  // C'était un appel /api/onboarding depuis le navigateur ; le profil est déjà
  // lu ici, la décision ne coûte plus rien.
  if (initial?.hasProfile === false) redirect("/onboarding");
  return <BriefToolClient initial={initial} />;
}

async function loadInitial(): Promise<BriefPageInitial | null> {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  // Sans session, le composant client garde son comportement d'origine
  // (bannière de connexion). Sans jeton d'agenda (compte email), seuls les
  // RDV ajoutés à la main sont lus.
  if (!auth.ok || !session) return null;
  const [calendar, briefs, profile, dealActions] = await Promise.all([
    loadUpcomingEvents(session, auth.userId),
    getRecentBriefsForUser(auth.userId, 5).catch(() => []),
    // `undefined` = lecture en échec : on ne renvoie pas à l'onboarding sur une
    // panne de base.
    getUserProfile(auth.userId).catch(() => undefined),
    loadDealActions(auth.userId).catch(() => null),
  ]);
  return {
    events: calendar.ok ? calendar.events : null,
    error: calendar.ok ? null : calendar.error,
    briefs,
    hasProfile: profile === undefined ? null : profile !== null,
    // Ce que l'onboarding a appris : sert l'accueil personnalisé (WelcomeKit).
    profile: profile
      ? { companyName: profile.company_name, offer: profile.product_description, icp: profile.icp, sector: profile.sector }
      : null,
    firstName: session.user?.name?.trim().split(/\s+/)[0] ?? null,
    dealActions,
  };
}

// « Aujourd'hui » (question 13, validée par Hubert : la page Brief devient le
// point de départ de la journée) : à côté des rendez-vous du jour, les deals
// qui demandent une action — à relancer, à traiter — tels que « Mes deals »
// les calcule. Organisations en test seulement ; null ailleurs.
async function loadDealActions(userId: string): Promise<BriefPageInitial["dealActions"]> {
  const organizationId = await getUserOrganizationId(userId);
  if (!organizationId || !(await isDealMemoryEnabledForOrganization(organizationId))) return null;
  const [fiches, rules] = await Promise.all([getProgressFichesForUser(organizationId, userId), getOrganizationDealRules(organizationId)]);
  return buildDealProgressNow(fiches, rules)
    .filter((d) => !d.hubspot?.closed && d.focus.status !== "bonne_voie")
    .map((d) => ({ id: d.id, name: d.name, status: d.focus.status, action: d.focus.action, detail: d.focus.detail }));
}
