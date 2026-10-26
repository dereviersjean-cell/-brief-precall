import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { isUuid } from "@/lib/uuid";
import { getCallWithAnalysis, getCallWithAnalysisForManager, isDealMemoryEnabledForOrganization } from "@/lib/db";
import { runDealMemoryForCall } from "@/lib/deal-memory-run";
import { reportError } from "@/lib/monitoring";

// Un appel Sonnet sur un transcript complet : 30 à 60 s sur un call d'une
// heure, deux quand le deal n'est reconnu qu'après la première fiche.
export const maxDuration = 300;

// Génère (ou régénère) la fiche deal d'un call. Phase « à blanc » (Deal
// Execution, étape 1) : réservé aux managers des organisations où la fiche
// est ouverte — un commercial ne la voit pas encore.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return NextResponse.json({ error: "Fiche deal indisponible." }, { status: 404 });
  }

  const { id: callId } = await params;
  if (!isUuid(callId)) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });

  const rl = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  // Ses propres calls, ou ceux de ses commerciaux liés — même résolution que
  // la page du call.
  const call = (await getCallWithAnalysis(callId, auth.userId)) ?? (await getCallWithAnalysisForManager(callId, auth.userId));
  if (!call) return NextResponse.json({ error: "Call introuvable." }, { status: 404 });
  if (!call.transcript && !call.transcript_json?.turns?.length) {
    return NextResponse.json({ error: "Transcript indisponible pour ce call." }, { status: 400 });
  }

  try {
    // Le deal entier change avec cette fiche (ses calls, sa mémoire) : la page
    // se recharge pour le montrer à jour.
    const stored = await runDealMemoryForCall(call, auth.organizationId);
    return NextResponse.json({ dealMemory: stored });
  } catch (err) {
    reportError("deal-memory.generate", err, { callId });
    return NextResponse.json({ error: "La génération de la fiche a échoué." }, { status: 502 });
  }
}
