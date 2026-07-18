import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { setImportHubSpotTasksSetting } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Champ 'enabled' manquant ou invalide." }, { status: 400 });
  }

  try {
    await setImportHubSpotTasksSetting(auth.userId, body.enabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tasks/import-hubspot-setting] setImportHubSpotTasksSetting failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}
