import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import {
  getUserRole,
  getUserOrganizationId,
  listReviewedObjectionEvalAnnotations,
  listObjectionCategories,
} from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase";
import { extractObjectionsFromTranscript } from "@/lib/call-analysis";
import { classifyAndEvaluateObjections } from "@/lib/objection-classifier";
import { evaluateObjections, aggregate, type EvalResult } from "@/lib/objection-eval";

// Rejoue le pipeline complet (extraction PUIS rattachement) sur les calls
// annotés et le compare à la référence. On rejoue plutôt que de lire
// call_objections : les données stockées peuvent dater d'un prompt antérieur,
// et ce qu'on veut mesurer c'est le pipeline TEL QU'IL EST MAINTENANT.
//
// Plusieurs appels Claude en chaîne — largement au-delà des 10 s par défaut.
export const maxDuration = 300;

export type EvalRunCall = {
  callId: string;
  label: string;
  expectedCount: number;
  detectedCount: number;
  precision: number;
  recall: number;
  categoryAccuracy: number | null;
  missed: string[];
  spurious: string[];
  misplaced: { objection: string; expected: string | null; got: string | null }[];
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const annotations = await listReviewedObjectionEvalAnnotations(organizationId).catch(() => []);
  if (annotations.length === 0) {
    return NextResponse.json(
      { error: "Aucun call validé. Validez au moins un call avant de lancer la mesure." },
      { status: 400 }
    );
  }

  const categories = await listObjectionCategories(organizationId).catch(() => []);
  const categoriesForClassifier = categories.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    handling_guidance: c.handlingGuidance,
    example_phrasings: c.examplePhrasings,
  }));
  const labelById = new Map(categories.map((c) => [c.id, c.label]));

  const results: EvalResult[] = [];
  const calls: EvalRunCall[] = [];

  for (const annotation of annotations) {
    const { data } = await supabaseAdmin
      .from("calls")
      .select("transcript")
      .eq("id", annotation.callId)
      .maybeSingle();
    const transcript = (data as { transcript: string | null } | null)?.transcript;
    if (!transcript) continue;

    const objections = await extractObjectionsFromTranscript(transcript);
    const classified = await classifyAndEvaluateObjections(categoriesForClassifier, objections, transcript);

    const predicted = classified.map((c) => ({
      objection: c.objection,
      categoryLabel: c.categoryId ? labelById.get(c.categoryId) ?? null : null,
    }));

    const result = await evaluateObjections(annotation.expected, predicted);
    results.push(result);
    calls.push({
      callId: annotation.callId,
      label: annotation.companyName || `Call du ${annotation.callId.slice(0, 8)}`,
      expectedCount: annotation.expected.length,
      detectedCount: predicted.length,
      precision: result.precision,
      recall: result.recall,
      categoryAccuracy: result.categoryAccuracy,
      missed: result.missed.map((m) => m.objection),
      spurious: result.spurious.map((s) => s.objection),
      misplaced: result.matched
        .filter((m) => !m.categoryCorrect)
        .map((m) => ({ objection: m.expected.objection, expected: m.expected.category, got: m.predicted.categoryLabel })),
    });
  }

  if (results.length === 0) {
    return NextResponse.json({ error: "Aucun transcript exploitable parmi les calls validés." }, { status: 400 });
  }

  return NextResponse.json({ total: aggregate(results), calls, ranAt: new Date().toISOString() });
}
