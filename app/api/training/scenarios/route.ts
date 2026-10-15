import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isTrainingEnabledForOrganization, listTrainingObjectionCandidatesForUser } from "@/lib/db";

// Scénarios suggérés (les « pains » du commercial) — lecture DB pure, pas
// d'appel IA, donc pas de rate limit génération.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  const organizationId = auth.organizationId;
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
