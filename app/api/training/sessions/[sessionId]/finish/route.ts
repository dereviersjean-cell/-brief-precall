import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { completeTrainingSession, getTrainingSession, isTrainingEnabledForOrganization } from "@/lib/db";
import { generateTrainingDebrief } from "@/lib/training";

// Termine la session : génère le débrief noté et clôt la session.
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const { sessionId } = await params;
  const trainingSession = await getTrainingSession(sessionId, auth.userId);
  if (!trainingSession) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }
  if (trainingSession.status !== "active") {
    // Idempotent : renvoyer le débrief déjà généré plutôt qu'une erreur (un
    // double-clic ou un retry réseau ne doit pas régénérer ni échouer).
    return NextResponse.json({ debrief: trainingSession.debrief });
  }

  // Gate serveur (pas que l'UI) — module additionnel désactivé par défaut,
  // migration 003. Placé après le repli idempotent ci-dessus : lire un
  // débrief déjà généré reste possible même si le module est désactivé
  // depuis, seule la génération d'un NOUVEAU débrief est bloquée.
  if (!trainingSession.organization_id || !(await isTrainingEnabledForOrganization(trainingSession.organization_id))) {
    return NextResponse.json({ error: "Module Entraînement non débloqué pour votre organisation." }, { status: 403 });
  }

  const commercialTurns = trainingSession.transcript.filter((t) => t.role === "commercial").length;
  if (commercialTurns < 1) {
    return NextResponse.json({ error: "Répondez au moins une fois au prospect avant de terminer." }, { status: 400 });
  }

  try {
    const debrief = await generateTrainingDebrief(
      trainingSession.organization_id,
      trainingSession.scenario,
      trainingSession.transcript
    );
    await completeTrainingSession(sessionId, auth.userId, debrief);
    return NextResponse.json({ debrief });
  } catch (err) {
    console.error("[training/finish] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Le débrief n'a pas pu être généré — réessayez." }, { status: 502 });
  }
}
