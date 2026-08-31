import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getDigestRecipientById, getDigestPreference, type DigestTiming } from "@/lib/db";
import { sendWeeklyDigestForUser } from "@/lib/digest";

const VALID_TIMINGS: DigestTiming[] = ["friday_evening", "monday_morning"];

// Self-service "send it to me now" — lets a user preview their own digest
// (either timing, via the optional body param) without waiting for the
// actual Friday/Monday cron, and independently of whether the channel is
// currently enabled (an explicit manual trigger, not the real dispatch
// path — lib/inngest-functions.ts's crons are the only thing gated by
// digest_preferences.enabled).
export async function POST(request: NextRequest) {
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

  let body: { timing?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — falls back to the user's saved preference below
  }

  let timing: DigestTiming;
  if (body.timing && VALID_TIMINGS.includes(body.timing as DigestTiming)) {
    timing = body.timing as DigestTiming;
  } else {
    timing = (await getDigestPreference(auth.userId)).timing;
  }

  const recipient = await getDigestRecipientById(auth.userId);
  if (!recipient) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const result = await sendWeeklyDigestForUser(recipient, timing, new Date());
  if (result.outcome === "error") {
    return NextResponse.json({ error: result.detail ?? "Échec de l'envoi." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, timing });
}
