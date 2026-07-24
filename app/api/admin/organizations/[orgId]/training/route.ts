import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setTrainingEnabledForOrganization } from "@/lib/db";

// Déblocage manuel du module Entraînement (addon désactivé par défaut,
// migration 003) — même logique d'override support que
// /api/admin/organizations/[orgId]/billing, mais ça n'agite aucun objet
// Stripe : juste un flag côté Brief.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  let enabled: boolean;
  try {
    ({ enabled } = (await request.json()) as { enabled: boolean });
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) requis." }, { status: 400 });
  }

  await setTrainingEnabledForOrganization(orgId, enabled);
  return NextResponse.json({ ok: true });
}
