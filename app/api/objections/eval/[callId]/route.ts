import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, saveObjectionEvalAnnotation } from "@/lib/db";

// Enregistre l'annotation de référence d'un call (page Calibrage).
// Pas de génération IA ici — c'est une simple écriture, donc pas de rate limit
// de génération : l'expert enregistre souvent pendant qu'il annote.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ callId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const { callId } = await params;

  let body: { expected?: { objection?: string; category?: string | null }[]; reviewed?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const expected = (Array.isArray(body.expected) ? body.expected : [])
    .map((o) => ({
      objection: String(o.objection ?? "").trim(),
      category: o.category ? String(o.category).trim() : null,
    }))
    .filter((o) => o.objection.length > 0);

  try {
    await saveObjectionEvalAnnotation(organizationId, callId, auth.userId, expected, body.reviewed === true);
    return NextResponse.json({ ok: true, count: expected.length });
  } catch (err) {
    console.error("[objections/eval] saveObjectionEvalAnnotation failed:", err);
    return NextResponse.json(
      { error: "Enregistrement impossible — la migration 008 est-elle bien passée ?" },
      { status: 500 }
    );
  }
}
