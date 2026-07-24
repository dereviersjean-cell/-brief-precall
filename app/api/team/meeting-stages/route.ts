import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, getMeetingStageConfigForOrganization, saveMeetingStageConfigForOrganization } from "@/lib/db";
import { coerceMeetingStageConfig, MEETING_STAGES } from "@/lib/meeting-stage";

const MAX_PATTERNS_PER_STAGE = 10;
const MAX_PATTERN_LENGTH = 120;
const MAX_GUIDANCE_LENGTH = 2000;

// Config des étapes de RDV (R1/R2/R3) de l'organisation — manager only, y
// compris en lecture : seule l'UI /team/meeting-stages la consomme.
async function requireManagerWithOrg() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return { ok: false as const, response: NextResponse.json({ error: "Réservé aux managers." }, { status: 403 }) };
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 }),
    };
  }

  return { ok: true as const, orgId };
}

export async function GET() {
  const auth = await requireManagerWithOrg();
  if (!auth.ok) return auth.response;

  const config = await getMeetingStageConfigForOrganization(auth.orgId);
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const auth = await requireManagerWithOrg();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  // coerce = merge défensif vers une config complète (les champs vides
  // retombent sur les défauts du code) ; on borne ensuite les tailles pour ne
  // pas laisser gonfler le jsonb ni le prompt d'analyse.
  const config = coerceMeetingStageConfig(body);
  for (const stage of MEETING_STAGES) {
    if (config[stage].patterns.length > MAX_PATTERNS_PER_STAGE) {
      return NextResponse.json({ error: `Maximum ${MAX_PATTERNS_PER_STAGE} motifs par étape.` }, { status: 400 });
    }
    if (config[stage].patterns.some((p) => p.length > MAX_PATTERN_LENGTH)) {
      return NextResponse.json({ error: `Un motif ne peut pas dépasser ${MAX_PATTERN_LENGTH} caractères.` }, { status: 400 });
    }
    if (config[stage].guidance.length > MAX_GUIDANCE_LENGTH) {
      return NextResponse.json({ error: `Les consignes ne peuvent pas dépasser ${MAX_GUIDANCE_LENGTH} caractères.` }, { status: 400 });
    }
  }

  try {
    await saveMeetingStageConfigForOrganization(auth.orgId, config);
    return NextResponse.json(config);
  } catch (err) {
    console.error("[meeting-stages] save failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Enregistrement impossible — la migration 001_meeting_stages a-t-elle été appliquée ?" },
      { status: 500 }
    );
  }
}
