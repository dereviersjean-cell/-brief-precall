import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { setNonCommercialConfig } from "@/lib/db";

// Réglage des rendez-vous non commerciaux de l'organisation (migration 041) :
// détection allumée ou non, et les mots du titre qui la déclenchent.
// Réservé aux managers : il vaut pour toute l'équipe.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId) {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { enabled?: unknown; keywords?: unknown } | null;
  if (!body || typeof body.enabled !== "boolean" || !Array.isArray(body.keywords)) {
    return NextResponse.json({ error: "Réglage invalide." }, { status: 400 });
  }
  const keywords = [
    ...new Set(
      body.keywords
        .filter((k): k is string => typeof k === "string")
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && k.length <= 60)
    ),
  ].slice(0, 100);

  try {
    await setNonCommercialConfig(auth.organizationId, { enabled: body.enabled, keywords });
  } catch (err) {
    console.error("[settings/non-commercial] save failed:", err);
    return NextResponse.json({ error: "Impossible d'enregistrer le réglage pour le moment." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enabled: body.enabled, keywords });
}
