import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setAccessLevelForOrganization } from "@/lib/db";

// Niveau d'accès d'une organisation (migration 024, lib/modules.ts) :
// 'briefs' pour une inscription libre, 'full' une fois cliente. Passer en
// 'full' ouvre le socle (agenda, enregistrement, analyse) ; les modules
// restent réglés à part, dans le Parcours.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  let accessLevel: unknown;
  try {
    ({ accessLevel } = (await request.json()) as { accessLevel: unknown });
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (accessLevel !== "full" && accessLevel !== "briefs") {
    return NextResponse.json({ error: "accessLevel : 'full' ou 'briefs' attendu." }, { status: 400 });
  }

  try {
    await setAccessLevelForOrganization(orgId, accessLevel);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "42703" || code === "PGRST204") {
      return NextResponse.json(
        { error: "La migration 024 (niveau d'accès) n'est pas encore passée sur Supabase." },
        { status: 409 }
      );
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
