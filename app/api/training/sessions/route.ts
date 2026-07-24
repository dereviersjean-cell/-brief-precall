import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { createTrainingSession, getUserOrganizationId, type TrainingScenario, type TrainingTurn } from "@/lib/db";
import { generateOpeningLine, generatePersona } from "@/lib/training";
import { MEETING_STAGE_LABELS, MEETING_STAGES, type MeetingStage } from "@/lib/meeting-stage";

const MAX_OBJECTION_LENGTH = 500;

// Démarre une session d'entraînement : persona + première réplique du
// prospect, persistées avec le scénario. Deux appels IA → rate-limité.
export async function POST(request: NextRequest) {
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

  let body: {
    objection?: string;
    originalResponse?: string | null;
    source?: string;
    sourceCallId?: string | null;
    companyName?: string | null;
    meetingStage?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const objection = body.objection?.trim();
  if (!objection) {
    return NextResponse.json({ error: "objection requise." }, { status: 400 });
  }
  if (objection.length > MAX_OBJECTION_LENGTH) {
    return NextResponse.json({ error: `L'objection ne peut pas dépasser ${MAX_OBJECTION_LENGTH} caractères.` }, { status: 400 });
  }

  const source: TrainingScenario["source"] =
    body.source === "no_response" || body.source === "lost_deal" || body.source === "unknown_outcome" ? body.source : "custom";
  const meetingStage: MeetingStage | null = MEETING_STAGES.includes(body.meetingStage as MeetingStage)
    ? (body.meetingStage as MeetingStage)
    : null;

  const organizationId = await getUserOrganizationId(auth.userId);

  try {
    const persona = await generatePersona(
      objection,
      body.companyName ?? null,
      meetingStage ? MEETING_STAGE_LABELS[meetingStage] : null
    );

    const scenario: TrainingScenario = {
      objection,
      originalResponse: body.originalResponse ?? null,
      source,
      sourceCallId: body.sourceCallId ?? null,
      companyName: body.companyName ?? null,
      meetingStage,
      persona,
    };

    const opening = await generateOpeningLine(scenario);
    const transcript: TrainingTurn[] = [{ role: "prospect", text: opening, at: new Date().toISOString() }];

    const { id } = await createTrainingSession(auth.userId, organizationId, scenario, transcript);
    return NextResponse.json({ id, scenario, transcript });
  } catch (err) {
    console.error("[training/sessions] create failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Impossible de démarrer la session — la migration 002_training_sessions a-t-elle été appliquée ?" },
      { status: 502 }
    );
  }
}
