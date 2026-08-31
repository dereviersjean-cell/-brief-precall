import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getUserOrganizationId, getDealOutcomeForContact } from "@/lib/db";
import { findSimilarObjections } from "@/lib/objections";

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

  let text: string;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text requis." }, { status: 400 });
  }

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ similar: [] });
  }

  try {
    const similar = await findSimilarObjections(organizationId, text.trim());

    // Best-effort outcome badge per result — a lookup failure just omits the
    // badge for that item, it never breaks the similarity results themselves.
    const enriched = await Promise.all(
      similar.map(async (s) => {
        if (!s.contact_email) return { ...s, outcome: null };
        const outcome = await getDealOutcomeForContact(organizationId, s.contact_email).catch(() => null);
        return { ...s, outcome };
      })
    );

    return NextResponse.json({ similar: enriched });
  } catch (err) {
    console.error("[objections/similar] findSimilarObjections failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Recherche indisponible pour le moment." }, { status: 502 });
  }
}
