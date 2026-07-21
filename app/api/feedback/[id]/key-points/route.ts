import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole, updateCallAnalysisKeyPoints } from "@/lib/db";
import { generateKeyPoints } from "@/lib/key-points";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id: callId } = await params;

  // Same owner-then-manager resolution as /feedback/[id]/page.tsx — a
  // manager reviewing a commercial's call can trigger generation too (the
  // result is cached on the call, visible to the owner afterwards).
  let call = await getCallWithAnalysis(callId, auth.userId);
  if (!call) {
    const role = await getUserRole(auth.userId);
    if (role === "manager") {
      call = await getCallWithAnalysisForManager(callId, auth.userId);
    }
  }
  if (!call) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 404 });
  }
  if (!call.analysis) {
    return NextResponse.json({ error: "Aucune analyse disponible pour ce call." }, { status: 400 });
  }

  // Idempotent — already generated, just return the cached value.
  if (call.analysis.key_points) {
    return NextResponse.json({ key_points: call.analysis.key_points });
  }

  // transcript_json (sous-étape A) is preferred: real per-turn speaker names
  // give Claude far better material to attribute decisions/actions to the
  // right person than the flat column, which is "Unknown" for every turn on
  // every call (transcriptToText doesn't read Recall's real participant
  // field — see lib/recall.ts). Falls back to the flat text for calls
  // ingested before transcript_json existed.
  const transcriptText = call.transcript_json
    ? call.transcript_json.turns
        .map((t) => `${call.speaker_names_override[t.speaker_id] || t.speaker_id}: ${t.text}`)
        .join("\n")
    : call.transcript;

  if (!transcriptText) {
    return NextResponse.json({ error: "Transcript indisponible pour ce call." }, { status: 400 });
  }

  const keyPoints = await generateKeyPoints(transcriptText);
  if (!keyPoints) {
    console.error("[feedback/:id/key-points] generateKeyPoints returned null for call", callId);
    return NextResponse.json({ error: "La génération des points clés a échoué." }, { status: 502 });
  }

  try {
    await updateCallAnalysisKeyPoints(call.analysis.id, call.id, keyPoints);
  } catch (err) {
    console.error("[feedback/:id/key-points] updateCallAnalysisKeyPoints failed:", err);
    // Non-fatal — the generation succeeded, just wasn't cached. Returning it
    // anyway means the user isn't blocked; the next visit will just retry.
  }

  return NextResponse.json({ key_points: keyPoints });
}
