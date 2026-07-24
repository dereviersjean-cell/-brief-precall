import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserOrganizationId, isTrainingEnabledForOrganization, listTrainingObjectionCandidatesForUser } from "@/lib/db";

// Scénarios suggérés (les « pains » du commercial) — lecture DB pure, pas
// d'appel IA, donc pas de rate limit génération.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ candidates: [] });
  }

  // Gate serveur (pas que l'UI) — module additionnel désactivé par défaut,
  // migration 003. Fail-closed inclus dans isTrainingEnabledForOrganization.
  if (!(await isTrainingEnabledForOrganization(organizationId))) {
    return NextResponse.json({ error: "Module Entraînement non débloqué pour votre organisation." }, { status: 403 });
  }

  try {
    const candidates = await listTrainingObjectionCandidatesForUser(auth.userId, organizationId);
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[training/scenarios] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ candidates: [] });
  }
}
