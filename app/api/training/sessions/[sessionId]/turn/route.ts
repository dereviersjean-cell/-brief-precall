import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getTrainingSession, isTrainingEnabledForOrganization, saveTrainingTranscript, type TrainingTurn } from "@/lib/db";
import { generateProspectReply, MAX_COMMERCIAL_TURNS } from "@/lib/training";

const MAX_MESSAGE_LENGTH = 2000;

// Un tour de conversation : réplique du commercial → réponse du prospect IA,
// les deux ajoutées au transcript persisté.
export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message requis." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message trop long (max ${MAX_MESSAGE_LENGTH} caractères).` }, { status: 400 });
  }

  const { sessionId } = await params;
  const trainingSession = await getTrainingSession(sessionId, auth.userId);
  if (!trainingSession) {
    return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  }
  if (trainingSession.status !== "active") {
    return NextResponse.json({ error: "Session déjà terminée." }, { status: 409 });
  }

  // Gate serveur (pas que l'UI) — module additionnel désactivé par défaut,
  // migration 003. Fail-closed inclus dans isTrainingEnabledForOrganization.
  if (!trainingSession.organization_id || !(await isTrainingEnabledForOrganization(trainingSession.organization_id))) {
    return NextResponse.json({ error: "Module Entraînement non débloqué pour votre organisation." }, { status: 403 });
  }

  const commercialTurns = trainingSession.transcript.filter((t) => t.role === "commercial").length;
  if (commercialTurns >= MAX_COMMERCIAL_TURNS) {
    return NextResponse.json({ error: "Nombre de tours maximum atteint — terminez la session pour obtenir votre débrief." }, { status: 409 });
  }

  try {
    const withCommercial: TrainingTurn[] = [
      ...trainingSession.transcript,
      { role: "commercial", text: message, at: new Date().toISOString() },
    ];
    const reply = await generateProspectReply(trainingSession.scenario, withCommercial);
    const transcript: TrainingTurn[] = [...withCommercial, { role: "prospect", text: reply, at: new Date().toISOString() }];
    await saveTrainingTranscript(sessionId, auth.userId, transcript);

    return NextResponse.json({ reply, commercialTurns: commercialTurns + 1, maxTurns: MAX_COMMERCIAL_TURNS });
  } catch (err) {
    console.error("[training/turn] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Le prospect IA n'a pas pu répondre — réessayez." }, { status: 502 });
  }
}
